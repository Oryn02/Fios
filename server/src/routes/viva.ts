import { Router, Response } from 'express';
import { requireUser, type AuthedRequest } from '../middleware/requireUser.js';
import { vivaCoachTurn } from '../geminiService.js';

const router = Router();

function apiKeyOf(req: AuthedRequest): string | undefined {
  return (req.body && req.body.apiKey) || req.header('x-gemini-key') || undefined;
}

/** POST /api/viva/turn */
router.post('/turn', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const content = String(req.body?.content || '').trim();
    if (!content) {
      res.status(400).json({ error: 'content required' });
      return;
    }
    const result = await vivaCoachTurn({
      content,
      transcript: req.body?.transcript,
      wpm: req.body?.wpm != null ? Number(req.body.wpm) : undefined,
      fillerCount: req.body?.fillerCount != null ? Number(req.body.fillerCount) : undefined,
      history: Array.isArray(req.body?.history) ? req.body.history : [],
      apiKey: apiKeyOf(req),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Viva turn failed' });
  }
});

export default router;
