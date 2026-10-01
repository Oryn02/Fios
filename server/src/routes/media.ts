import { Router, Response } from 'express';
import { requireUser, type AuthedRequest } from '../middleware/requireUser.js';
import { synthesizeSpeech } from '../services/ttsService.js';
import { isPlatformKey } from '../geminiService.js';
import { assertWithinQuota, recordUsage, estimateTokensFromText } from '../services/usageMeter.js';
import { saasGenerate } from '../geminiService.js';

const router = Router();

function apiKeyOf(req: AuthedRequest): string | undefined {
  const headerKey = req.header('x-gemini-key');
  return (req.body && req.body.apiKey) || headerKey || undefined;
}

/**
 * POST /api/media/audio-recap
 * Summarize study text (optional) then TTS to MP3.
 * Does NOT collide with legacy /media/process.
 */
router.post('/audio-recap', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    let text = String(req.body?.text || req.body?.summary || '').trim();
    const source = String(req.body?.source || '').trim();
    const apiKey = apiKeyOf(req);

    if (!text && source) {
      const billed = isPlatformKey(apiKey);
      const estimate = estimateTokensFromText(source);
      const quota = await assertWithinQuota(req.userId!, estimate, billed);
      if (!quota.ok) {
        res.status(429).json({ error: quota.error, usage: quota });
        return;
      }
      const summary = await saasGenerate({
        prompt: `Write a concise spoken study recap (under 400 words) from these notes:\n\n${source.slice(0, 20000)}`,
        system: 'You write clear audio study recaps: short sentences, no markdown headings, no bullet symbols.',
        apiKey,
      });
      text = summary.text;
      await recordUsage(req.userId!, estimateTokensFromText(source, text), billed);
    }

    if (!text) {
      res.status(400).json({ error: 'text or source is required' });
      return;
    }

    const audio = await synthesizeSpeech(text);
    const format = String(req.query.format || req.body?.format || 'binary');
    if (format === 'base64' || format === 'json') {
      res.json({
        mimeType: audio.mimeType,
        provider: audio.provider,
        text,
        audioBase64: audio.buffer.toString('base64'),
      });
      return;
    }
    res.setHeader('Content-Type', audio.mimeType);
    res.setHeader('X-TTS-Provider', audio.provider);
    res.setHeader('X-Recap-Chars', String(text.length));
    res.send(audio.buffer);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Audio recap failed';
    res.status(500).json({ error: msg });
  }
});

export default router;
