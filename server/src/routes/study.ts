import { Router, Response } from 'express';
import { requireUser, type AuthedRequest } from '../middleware/requireUser.js';
import { getSupabaseAdmin, getSupabaseAsUser } from '../supabaseAdmin.js';
import { reviewWithFsrs, type FsrsRating } from '../services/fsrsService.js';
import { buildAnkiApkg } from '../services/ankiExport.js';
import {
  socraticTutorTurn,
  generateMnemonic,
  gradeSpokenRecall,
  elaborativeInterrogation,
  feynmanStudentTurn,
  generateDualCodeAsset,
} from '../geminiService.js';
import { runCode, outputsMatch } from '../services/codeRunner.js';

const router = Router();

function apiKeyOf(req: AuthedRequest): string | undefined {
  const headerKey = req.header('x-gemini-key');
  return (req.body && req.body.apiKey) || headerKey || undefined;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function reviewSm2Light(
  card: { ease_factor?: number; interval?: number; repetitions?: number },
  rating: FsrsRating,
  now = new Date()
) {
  let ease = Number(card.ease_factor) || 2.5;
  let interval = Number(card.interval) || 0;
  let repetitions = Number(card.repetitions) || 0;
  if (rating < 3) {
    repetitions = 0;
    interval = 0;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.max(1, Math.round(interval * ease));
    repetitions += 1;
    const q = rating + 1;
    ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  }
  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + interval);
  return {
    ease_factor: ease,
    interval,
    repetitions,
    next_review: next.toISOString(),
    scheduler: 'sm2' as const,
  };
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
    const freezeUntil = row.streak_freeze_until
      ? String(row.streak_freeze_until).slice(0, 10)
      : null;
    if (last === today) {
      current = Number(row.current_streak) || 1;
      longest = Math.max(Number(row.longest_streak) || 0, current);
      xp = (Number(row.xp) || 0) + xpGain;
    } else {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yKey = dayKey(yesterday);
      const freezeCovers = freezeUntil && last && freezeUntil >= yKey && last < today;
      current =
        last === yKey || freezeCovers ? (Number(row.current_streak) || 0) + 1 : 1;
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

/** POST /api/study/socratic */
router.post('/socratic', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const cardFront = String(req.body?.cardFront || req.body?.front || '').trim();
    const cardBack = String(req.body?.cardBack || req.body?.back || '').trim();
    const message = String(req.body?.message || req.body?.studentMessage || '').trim();
    if (!cardFront || !cardBack || !message) {
      res.status(400).json({ error: 'cardFront, cardBack, and message are required' });
      return;
    }
    const history = Array.isArray(req.body?.history)
      ? req.body.history.map((h: any) => ({
          role: String(h.role || 'student'),
          content: String(h.content || h.text || ''),
        }))
      : [];
    const result = await socraticTutorTurn({
      cardFront,
      cardBack,
      history,
      studentMessage: message,
      apiKey: apiKeyOf(req),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Socratic turn failed' });
  }
});

/** POST /api/study/mnemonic */
router.post('/mnemonic', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const front = String(req.body?.front || req.body?.cardFront || '').trim();
    const back = String(req.body?.back || req.body?.cardBack || '').trim();
    if (!front || !back) {
      res.status(400).json({ error: 'front and back are required' });
      return;
    }
    const style = req.body?.style ? String(req.body.style) : undefined;
    const result = await generateMnemonic(front, back, style, apiKeyOf(req));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Mnemonic failed' });
  }
});

/** POST /api/study/run-code */
router.post('/run-code', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const language = String(req.body?.language || 'javascript');
    const source = String(req.body?.source || req.body?.code || '');
    if (!source.trim()) {
      res.status(400).json({ error: 'source is required' });
      return;
    }
    const stdin = req.body?.stdin != null ? String(req.body.stdin) : undefined;
    const expectedOutput =
      req.body?.expectedOutput != null ? String(req.body.expectedOutput) : undefined;
    const result = await runCode({ language, source, stdin });
    const payload: Record<string, unknown> = { ...result };
    if (expectedOutput != null) {
      payload.pass = outputsMatch(result.stdout, expectedOutput);
      payload.expectedOutput = expectedOutput;
    }
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Code run failed' });
  }
});

/**
 * POST /api/study/offline-sync
 * Body: { reviews: [{cardId, rating, scheduler, at}], streakBump? }
 */
router.post('/offline-sync', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const reviews = Array.isArray(req.body?.reviews) ? req.body.reviews : [];
    if (!reviews.length && !req.body?.streakBump) {
      res.status(400).json({ error: 'reviews or streakBump required' });
      return;
    }
    const admin = getSupabaseAdmin();
    const userClient = getSupabaseAsUser(req.accessToken || '');
    const db = admin || userClient;
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }

    const applied: any[] = [];
    const errors: { cardId: string; error: string }[] = [];

    for (const rev of reviews.slice(0, 500)) {
      const cardId = String(rev?.cardId || '').trim();
      const rating = Number(rev?.rating) as FsrsRating;
      if (!cardId || ![1, 2, 3, 4].includes(rating)) {
        errors.push({ cardId: cardId || '?', error: 'invalid rating' });
        continue;
      }
      try {
        const { data: card, error: fetchErr } = await db
          .from('cards')
          .select(
            'id, ease_factor, interval, repetitions, next_review, scheduler, fsrs_state, decks!inner(user_id)'
          )
          .eq('id', cardId)
          .maybeSingle();
        if (fetchErr || !card) {
          errors.push({ cardId, error: 'not found' });
          continue;
        }
        if ((card as any).decks?.user_id && (card as any).decks.user_id !== req.userId) {
          errors.push({ cardId, error: 'forbidden' });
          continue;
        }

        const scheduler =
          String(rev?.scheduler || card.scheduler || 'sm2').toLowerCase() === 'fsrs'
            ? 'fsrs'
            : 'sm2';
        const at = rev?.at ? new Date(rev.at) : new Date();
        let updates: Record<string, unknown>;

        if (scheduler === 'fsrs') {
          const result = reviewWithFsrs(card.fsrs_state as any, rating, at);
          updates = {
            scheduler: 'fsrs',
            fsrs_state: result.stateAfter,
            next_review: result.nextReview,
            interval: result.intervalDays,
            repetitions: result.repetitions,
            ease_factor: card.ease_factor ?? 2.5,
          };
          await db.from('card_reviews').insert({
            user_id: req.userId,
            card_id: cardId,
            rating,
            scheduler: 'fsrs',
            state_before: result.stateBefore,
            state_after: result.stateAfter,
            created_at: at.toISOString(),
          });
        } else {
          const sm2 = reviewSm2Light(card, rating, at);
          updates = sm2;
          await db.from('card_reviews').insert({
            user_id: req.userId,
            card_id: cardId,
            rating,
            scheduler: 'sm2',
            created_at: at.toISOString(),
          });
        }

        const { error: updErr } = await db.from('cards').update(updates).eq('id', cardId);
        if (updErr) {
          errors.push({ cardId, error: updErr.message });
          continue;
        }
        applied.push({ cardId, rating, scheduler, ...updates });
      } catch (err) {
        errors.push({
          cardId,
          error: err instanceof Error ? err.message : 'apply failed',
        });
      }
    }

    if (req.body?.streakBump || applied.length) {
      try {
        await bumpStreak(req.userId!, applied.length ? Math.min(40, applied.length * 4) : 10);
      } catch (err) {
        console.warn('offline-sync streak soft-fail:', err);
      }
    }

    res.json({
      applied: applied.length,
      results: applied,
      errors,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Offline sync failed' });
  }
});

/**
 * POST /api/study/voice-grade
 * Body: { front, back, spoken } → { rating 1-4, feedback, accuracy }
 */
router.post('/voice-grade', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const front = String(req.body?.front || req.body?.cardFront || '').trim();
    const back = String(req.body?.back || req.body?.cardBack || '').trim();
    const spoken = String(req.body?.spoken || req.body?.transcript || '').trim();
    if (!front || !back || !spoken) {
      res.status(400).json({ error: 'front, back, and spoken are required' });
      return;
    }
    const result = await gradeSpokenRecall({
      front,
      back,
      spoken,
      apiKey: apiKeyOf(req),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Voice grade failed',
    });
  }
});

/** POST /api/study/elaborate */
router.post('/elaborate', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const front = String(req.body?.front || req.body?.cardFront || '').trim();
    const back = String(req.body?.back || req.body?.cardBack || '').trim();
    if (!front || !back) {
      res.status(400).json({ error: 'front and back are required' });
      return;
    }
    const result = await elaborativeInterrogation({
      front,
      back,
      priorTopic: req.body?.priorTopic ? String(req.body.priorTopic) : undefined,
      apiKey: apiKeyOf(req),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Elaborate failed',
    });
  }
});

/** POST /api/study/feynman */
router.post('/feynman', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const topic = String(req.body?.topic || req.body?.front || '').trim();
    const explanation = String(
      req.body?.explanation || req.body?.teacherExplanation || req.body?.message || ''
    ).trim();
    if (!topic || !explanation) {
      res.status(400).json({ error: 'topic and explanation are required' });
      return;
    }
    const result = await feynmanStudentTurn({
      topic,
      teacherExplanation: explanation,
      history: Array.isArray(req.body?.history) ? req.body.history : [],
      apiKey: apiKeyOf(req),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Feynman turn failed',
    });
  }
});

/** POST /api/study/dual-code */
router.post('/dual-code', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const front = String(req.body?.front || req.body?.cardFront || '').trim();
    const back = String(req.body?.back || req.body?.cardBack || '').trim();
    if (!front || !back) {
      res.status(400).json({ error: 'front and back are required' });
      return;
    }
    const result = await generateDualCodeAsset({
      front,
      back,
      apiKey: apiKeyOf(req),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Dual-code failed',
    });
  }
});

/** GET /api/study/due-preview — IDE / widgets due list */
router.get('/due-preview', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const db = getSupabaseAsUser(req.accessToken || '') || getSupabaseAdmin();
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const { data, error } = await db
      .from('cards')
      .select('id, question, answer, next_review, scheduler, deck_id, decks(title)')
      .order('next_review', { ascending: true })
      .limit(80);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    const now = Date.now();
    const due = (data || []).filter((c: any) => {
      const t = c.next_review ? new Date(c.next_review).getTime() : 0;
      return t <= now;
    });
    res.json({
      cards: due.slice(0, 40).map((c: any) => ({
        id: c.id,
        question: c.question,
        answer: c.answer,
        scheduler: c.scheduler,
        deckTitle: c.decks?.title,
        deck_id: c.deck_id,
      })),
      count: due.length,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Due preview failed' });
  }
});

export default router;
