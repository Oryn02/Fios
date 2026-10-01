import { Router, Response } from 'express';
import { requireUser, type AuthedRequest } from '../middleware/requireUser.js';
import { getSupabaseAdmin, getSupabaseAsUser } from '../supabaseAdmin.js';

const router = Router();

function dbFor(req: AuthedRequest) {
  return getSupabaseAsUser(req.accessToken || '') || getSupabaseAdmin();
}

/**
 * POST /api/cognitive/jol
 * Judgment of Learning — student predicts recall before flip.
 * Body: { cardId, predicted: 1-5, actualSuccess?: boolean }
 */
router.post('/jol', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const cardId = String(req.body?.cardId || '').trim();
    const predicted = Number(req.body?.predicted);
    if (!cardId || ![1, 2, 3, 4, 5].includes(predicted)) {
      res.status(400).json({ error: 'cardId and predicted (1-5) are required' });
      return;
    }
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const actualSuccess =
      typeof req.body?.actualSuccess === 'boolean' ? req.body.actualSuccess : null;
    const { data, error } = await db
      .from('card_jol')
      .insert({
        user_id: req.userId,
        card_id: cardId,
        predicted,
        actual_success: actualSuccess,
      })
      .select('*')
      .maybeSingle();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true, row: data });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'JOL save failed',
    });
  }
});

/**
 * GET /api/cognitive/jol/stats — calibration hint (avg predicted vs success).
 */
router.get('/jol/stats', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const { data, error } = await db
      .from('card_jol')
      .select('predicted, actual_success')
      .eq('user_id', req.userId!)
      .limit(500);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    const rows = data || [];
    const withOutcome = rows.filter((r) => r.actual_success != null);
    const avgPredicted =
      rows.length > 0
        ? rows.reduce((s, r) => s + (Number(r.predicted) || 0), 0) / rows.length
        : 0;
    const successRate =
      withOutcome.length > 0
        ? withOutcome.filter((r) => r.actual_success).length / withOutcome.length
        : null;
    res.json({
      count: rows.length,
      avgPredicted,
      successRate,
      calibrationNote:
        successRate != null && avgPredicted >= 4 && successRate < 0.6
          ? 'You may be overconfident — try interleaved practice.'
          : null,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'JOL stats failed',
    });
  }
});

export default router;
