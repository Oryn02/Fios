import { Router, Response } from 'express';
import { requireUser, type AuthedRequest } from '../middleware/requireUser.js';
import {
  saasGenerate,
  runOralExamTurn,
  generateOcclusionMasks,
  isPlatformKey,
} from '../geminiService.js';
import { assertWithinQuota, recordUsage, estimateTokensFromText } from '../services/usageMeter.js';

const router = Router();

function apiKeyOf(req: AuthedRequest): string | undefined {
  const headerKey = req.header('x-gemini-key');
  return (req.body && req.body.apiKey) || headerKey || undefined;
}

function mapErr(error: unknown, fallback: string): string {
  const raw =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message || '')
      : String(error || '');
  return raw && !raw.includes('is not a function') ? raw : fallback;
}

/** POST /api/ai/generate — general study generation (metered when platform key). */
router.post('/generate', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const prompt = String(req.body?.prompt || req.body?.text || '').trim();
    if (!prompt) {
      res.status(400).json({ error: 'prompt is required' });
      return;
    }
    const apiKey = apiKeyOf(req);
    const billed = isPlatformKey(apiKey);
    const estimate = estimateTokensFromText(prompt, String(req.body?.system || ''));
    const quota = await assertWithinQuota(req.userId!, estimate, billed);
    if (!quota.ok) {
      res.status(429).json({ error: quota.error, usage: quota });
      return;
    }
    const result = await saasGenerate({
      prompt,
      system: req.body?.system,
      apiKey,
      preferPro: Boolean(req.body?.preferPro),
    });
    const used = estimateTokensFromText(prompt, result.text);
    const usage = await recordUsage(req.userId!, used, billed);
    res.json({ text: result.text, model: result.model, usage });
  } catch (error) {
    res.status(500).json({ error: mapErr(error, 'AI generate failed') });
  }
});

/** POST /api/ai/oral-exam — mock viva examiner turn. */
router.post('/oral-exam', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const material = String(req.body?.material || req.body?.text || '').trim();
    if (!material) {
      res.status(400).json({ error: 'material is required' });
      return;
    }
    const apiKey = apiKeyOf(req);
    const billed = isPlatformKey(apiKey);
    const estimate = estimateTokensFromText(material, String(req.body?.studentAnswer || ''));
    const quota = await assertWithinQuota(req.userId!, estimate, billed);
    if (!quota.ok) {
      res.status(429).json({ error: quota.error, usage: quota });
      return;
    }
    const turn = await runOralExamTurn({
      material,
      history: Array.isArray(req.body?.history) ? req.body.history : [],
      studentAnswer: req.body?.studentAnswer,
      apiKey,
      preferPro: req.body?.preferPro !== false,
    });
    const usage = await recordUsage(
      req.userId!,
      estimateTokensFromText(material, turn.question, turn.feedback),
      billed
    );
    res.json({ ...turn, usage });
  } catch (error) {
    res.status(500).json({ error: mapErr(error, 'Oral exam failed') });
  }
});

/** POST /api/ai/occlusion-mask — diagram occlusion regions from image. */
router.post('/occlusion-mask', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const imageBase64 = String(req.body?.imageBase64 || req.body?.image || '').trim();
    if (!imageBase64) {
      res.status(400).json({ error: 'imageBase64 is required' });
      return;
    }
    const apiKey = apiKeyOf(req);
    const billed = isPlatformKey(apiKey);
    const estimate = Math.ceil(imageBase64.length / 8) + 500;
    const quota = await assertWithinQuota(req.userId!, estimate, billed);
    if (!quota.ok) {
      res.status(429).json({ error: quota.error, usage: quota });
      return;
    }
    const result = await generateOcclusionMasks({
      imageBase64,
      mimeType: req.body?.mimeType,
      hint: req.body?.hint,
      apiKey,
    });
    const usage = await recordUsage(req.userId!, estimate, billed);
    res.json({ regions: result.regions, model: result.model, usage });
  } catch (error) {
    res.status(500).json({ error: mapErr(error, 'Occlusion mask failed') });
  }
});

export default router;
