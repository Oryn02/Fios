import { Router, Response } from 'express';
import { requireUser, type AuthedRequest } from '../middleware/requireUser.js';
import { getSupabaseAdmin, getSupabaseAsUser } from '../supabaseAdmin.js';
import { generateFlashcardsFromText, isPlatformKey, saasGenerate } from '../geminiService.js';
import { synthesizeSpeech } from '../services/ttsService.js';
import { assertWithinQuota, recordUsage, estimateTokensFromText } from '../services/usageMeter.js';

const router = Router();

function apiKeyOf(req: AuthedRequest): string | undefined {
  const headerKey = req.header('x-gemini-key');
  return (req.body && req.body.apiKey) || headerKey || undefined;
}

function dbFor(req: AuthedRequest) {
  return getSupabaseAsUser(req.accessToken || '') || getSupabaseAdmin();
}

/**
 * POST /api/clipper/clip
 * Soft-auth Bearer via requireUser. mode: 'deck' | 'audio-recap'
 */
router.post('/clip', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const title = String(req.body?.title || 'Web clip').trim() || 'Web clip';
    const text = String(req.body?.text || '').trim();
    const url = String(req.body?.url || '').trim() || undefined;
    const mode = String(req.body?.mode || 'deck').trim() as 'deck' | 'audio-recap';
    const moduleCode = String(req.body?.moduleCode || '').trim() || null;
    const apiKey = apiKeyOf(req);

    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    if (mode === 'audio-recap') {
      let spoken = text;
      try {
        const billed = isPlatformKey(apiKey);
        const estimate = estimateTokensFromText(text);
        const quota = await assertWithinQuota(req.userId!, estimate, billed);
        if (quota.ok) {
          const summary = await saasGenerate({
            prompt: `Write a concise spoken study recap (under 400 words) from this clipped page:\n\nTitle: ${title}\nURL: ${url || '(none)'}\n\n${text.slice(0, 20000)}`,
            system:
              'You write clear audio study recaps: short sentences, no markdown headings, no bullet symbols.',
            apiKey,
          });
          spoken = summary.text;
          await recordUsage(req.userId!, estimateTokensFromText(text, spoken), billed);
        }
      } catch (err) {
        console.warn('Clipper audio-recap summary soft-fail:', err);
      }

      try {
        const audio = await synthesizeSpeech(spoken);
        res.json({
          mode: 'audio-recap',
          title,
          url,
          text: spoken,
          mimeType: audio.mimeType,
          provider: audio.provider,
          audioBase64: audio.buffer.toString('base64'),
        });
      } catch (err) {
        res.json({
          mode: 'audio-recap',
          title,
          url,
          text: spoken,
          error: err instanceof Error ? err.message : 'TTS unavailable',
        });
      }
      return;
    }

    // mode === 'deck'
    let cards: any[] = [];
    let deckTitle = title;
    try {
      const result = await generateFlashcardsFromText(
        `${title}${url ? `\nSource: ${url}` : ''}\n\n${text}`,
        apiKey
      );
      deckTitle = typeof result?.title === 'string' && result.title.trim() ? result.title : title;
      cards = Array.isArray(result?.cards) ? result.cards : [];
    } catch (err) {
      console.warn('Clipper flashcard gen soft-fail:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to generate flashcards from clip',
      });
      return;
    }

    const db = dbFor(req);
    let deckId: string | null = null;
    if (db && cards.length) {
      try {
        const { data: deck, error: deckErr } = await db
          .from('decks')
          .insert({
            user_id: req.userId,
            title: deckTitle,
            module_code: moduleCode,
            description: url ? `Clipped from ${url}` : 'Web clipper',
          })
          .select('id')
          .single();
        if (!deckErr && deck?.id) {
          deckId = deck.id;
          const rows = cards.map((c: any) => ({
            deck_id: deck.id,
            question: String(c.front ?? c.question ?? ''),
            answer: String(c.back ?? c.answer ?? ''),
            ease_factor: 2.5,
            interval: 0,
            repetitions: 0,
            next_review: new Date().toISOString(),
            scheduler: 'sm2',
            source_page: c.sourcePage != null ? Number(c.sourcePage) : null,
            source_paragraph: c.sourceParagraph != null ? Number(c.sourceParagraph) : null,
            source_quote: c.sourceQuote ? String(c.sourceQuote) : null,
          }));
          await db.from('cards').insert(rows);
        }
      } catch (err) {
        console.warn('Clipper deck persist soft-fail:', err);
      }
    }

    res.json({
      mode: 'deck',
      title: deckTitle,
      url,
      moduleCode,
      deckId,
      cards,
      cardCount: cards.length,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Clip failed' });
  }
});

export default router;
