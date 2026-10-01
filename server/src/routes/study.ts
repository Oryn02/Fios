import { Router, Response } from 'express';
import { requireUser, type AuthedRequest } from '../middleware/requireUser.js';
import { getSupabaseAdmin, getSupabaseAsUser } from '../supabaseAdmin.js';
import { reviewWithFsrs, type FsrsRating } from '../services/fsrsService.js';
import { buildAnkiApkg } from '../services/ankiExport.js';

const router = Router();

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function bumpStreak(userId: string, xpGain = 10) {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  const today = dayKey(new Date());
  const { data: row } = await admin.from('user_streaks').select('*').eq('user_id', userId).maybeSingle();
  let current = 1;
  let longest = 1;
  let xp = xpGain;
  if (row) {
    const last = row.last_study_date ? String(row.last_study_date).slice(0, 10) : null;
    if (last === today) {
      current = Number(row.current_streak) || 1;
      longest = Math.max(Number(row.longest_streak) || 0, current);
      xp = (Number(row.xp) || 0) + xpGain;
    } else {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yKey = dayKey(yesterday);
      current = last === yKey ? (Number(row.current_streak) || 0) + 1 : 1;
      longest = Math.max(Number(row.longest_streak) || 0, current);
      xp = (Number(row.xp) || 0) + xpGain;
    }
  }
  await admin.from('user_streaks').upsert({
    user_id: userId,
    current_streak: current,
    longest_streak: longest,
    xp,
    last_study_date: today,
    updated_at: new Date().toISOString(),
  });
}

/**
 * POST /api/study/review — FSRS review (opt-in). Writes next_review + fsrs_state + card_reviews.
 */
router.post('/review', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const cardId = String(req.body?.cardId || '').trim();
    const rating = Number(req.body?.rating) as FsrsRating;
    if (!cardId || ![1, 2, 3, 4].includes(rating)) {
      res.status(400).json({ error: 'cardId and rating (1-4) are required' });
      return;
    }
    const admin = getSupabaseAdmin();
    const userClient = getSupabaseAsUser(req.accessToken || '');
    const db = admin || userClient;
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }

    const { data: card, error: fetchErr } = await db
      .from('cards')
      .select('id, deck_id, ease_factor, interval, repetitions, next_review, scheduler, fsrs_state, decks!inner(user_id)')
      .eq('id', cardId)
      .maybeSingle();

    if (fetchErr || !card) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }
    const ownerId = (card as any).decks?.user_id;
    if (ownerId && ownerId !== req.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const result = reviewWithFsrs(card.fsrs_state as any, rating);
    const updates = {
      scheduler: 'fsrs',
      fsrs_state: result.stateAfter,
      next_review: result.nextReview,
      interval: result.intervalDays,
      repetitions: result.repetitions,
      // Keep ease_factor present for SM-2 readers; leave unchanged or mild nudge
      ease_factor: card.ease_factor ?? 2.5,
    };

    const writer = admin || userClient!;
    const { error: updErr } = await writer.from('cards').update(updates).eq('id', cardId);
    if (updErr) {
      res.status(500).json({ error: updErr.message });
      return;
    }

    await writer.from('card_reviews').insert({
      user_id: req.userId,
      card_id: cardId,
      rating,
      scheduler: 'fsrs',
      duration_ms: req.body?.durationMs ? Number(req.body.durationMs) : null,
      state_before: result.stateBefore,
      state_after: result.stateAfter,
    });

    await bumpStreak(req.userId!, rating >= 3 ? 12 : 6);

    res.json({
      cardId,
      rating,
      next_review: result.nextReview,
      interval: result.intervalDays,
      repetitions: result.repetitions,
      fsrs_state: result.stateAfter,
      scheduler: 'fsrs',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Review failed';
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/study/export/anki — build .apkg from provided cards (or deckId lookup).
 */
router.post('/export/anki', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    let cards: { front: string; back: string }[] = [];
    let title = String(req.body?.title || 'Fios Deck').trim() || 'Fios Deck';

    if (Array.isArray(req.body?.cards) && req.body.cards.length) {
      cards = req.body.cards.map((c: any) => ({
        front: String(c.front ?? c.question ?? ''),
        back: String(c.back ?? c.answer ?? ''),
      }));
    } else if (req.body?.deckId) {
      const db = getSupabaseAdmin() || getSupabaseAsUser(req.accessToken || '');
      if (!db) {
        res.status(503).json({ error: 'Database not configured' });
        return;
      }
      const { data: deck } = await db
        .from('decks')
        .select('id, title, user_id, cards(question, answer)')
        .eq('id', String(req.body.deckId))
        .maybeSingle();
      if (!deck || deck.user_id !== req.userId) {
        res.status(404).json({ error: 'Deck not found' });
        return;
      }
      title = deck.title || title;
      cards = (deck.cards || []).map((c: any) => ({
        front: String(c.question || ''),
        back: String(c.answer || ''),
      }));
    }

    if (!cards.length) {
      res.status(400).json({ error: 'No cards to export' });
      return;
    }

    const buffer = await buildAnkiApkg(title, cards);
    const safeName = title.replace(/[^\w\-]+/g, '_').slice(0, 64) || 'fios_deck';
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.apkg"`);
    res.send(buffer);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Anki export failed';
    res.status(500).json({ error: msg });
  }
});

export default router;
