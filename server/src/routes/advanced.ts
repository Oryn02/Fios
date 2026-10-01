import { Router, Response } from 'express';
import { Type } from '@google/genai';
import { requireUser, type AuthedRequest } from '../middleware/requireUser.js';
import {
  generateWithFallback,
  generateFlashcardsFromText,
  processVisionOrAudio,
} from '../geminiService.js';
import { getSupabaseAdmin, getSupabaseAsUser } from '../supabaseAdmin.js';

const router = Router();

function apiKeyOf(req: AuthedRequest): string | undefined {
  return (req.body && req.body.apiKey) || req.header('x-gemini-key') || undefined;
}

function dbFor(req: AuthedRequest) {
  return getSupabaseAsUser(req.accessToken || '') || getSupabaseAdmin();
}

const deltaSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    slideOnly: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Concepts only in slides',
    },
    nuanced: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Where slides nuance or contradict textbook',
    },
    textbookOnly: { type: Type.ARRAY, items: { type: Type.STRING } },
    highYieldBullets: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['summary', 'slideOnly', 'nuanced', 'highYieldBullets'],
};

const debateScoreSchema = {
  type: Type.OBJECT,
  properties: {
    scoreA: { type: Type.INTEGER },
    scoreB: { type: Type.INTEGER },
    feedbackA: { type: Type.STRING },
    feedbackB: { type: Type.STRING },
    groundedNotes: { type: Type.STRING },
    winner: { type: Type.STRING },
  },
  required: ['scoreA', 'scoreB', 'feedbackA', 'feedbackB', 'groundedNotes'],
};

/** POST /api/advanced/delta — slide vs textbook */
router.post('/delta', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const textbook = String(req.body?.textbook || '').trim();
    const slides = String(req.body?.slides || '').trim();
    if (!textbook || !slides) {
      res.status(400).json({ error: 'textbook and slides text required' });
      return;
    }
    const { text } = await generateWithFallback({
      contents: `Compare textbook chapter vs lecture slides. Produce a Delta Report.\n\nTEXTBOOK:\n${textbook.slice(0, 20000)}\n\nSLIDES:\n${slides.slice(0, 20000)}`,
      apiKey: apiKeyOf(req),
      config: {
        responseMimeType: 'application/json',
        responseSchema: deltaSchema,
        systemInstruction:
          'Highlight slide-only content and nuanced differences that exams often target. Be concise and high-yield.',
      },
    });
    const report = JSON.parse(text.replace(/```json/gi, '').replace(/```/g, '').trim());
    const seed = [
      'DELTA HIGH-YIELD',
      ...(report.slideOnly || []).map((s: string) => `Slide-only: ${s}`),
      ...(report.nuanced || []).map((s: string) => `Nuance: ${s}`),
      ...(report.highYieldBullets || []),
    ].join('\n');
    const deck = await generateFlashcardsFromText(seed, apiKeyOf(req));
    res.json({ report, deck });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Delta failed' });
  }
});

/** POST /api/advanced/handwriting — multimodal OCR → markdown/LaTeX + optional deck */
router.post('/handwriting', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const mediaBase64 = String(req.body?.mediaBase64 || '').trim();
    const mimeType = String(req.body?.mimeType || 'image/jpeg');
    if (!mediaBase64) {
      res.status(400).json({ error: 'mediaBase64 required' });
      return;
    }
    const notes = await processVisionOrAudio(mediaBase64, mimeType, apiKeyOf(req));
    const markdown =
      (typeof (notes as any).markdown === 'string' && (notes as any).markdown) ||
      (typeof (notes as any).notes === 'string' && (notes as any).notes) ||
      (typeof (notes as any).text === 'string' && (notes as any).text) ||
      '';
    let deck = null;
    if (req.body?.makeDeck !== false && markdown.trim()) {
      deck = await generateFlashcardsFromText(
        `Convert these handwritten notes (may include math as LaTeX) into FSRS-ready cards:\n\n${markdown}`,
        apiKeyOf(req)
      );
    }
    res.json({ markdown, deck, raw: notes });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'OCR failed' });
  }
});

/** POST /api/advanced/debate/score — AI moderator vs course material */
router.post('/debate/score', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const topic = String(req.body?.topic || '').trim();
    const material = String(req.body?.material || '').trim();
    const sideA = String(req.body?.sideA || '').trim();
    const sideB = String(req.body?.sideB || '').trim();
    if (!topic || !sideA || !sideB) {
      res.status(400).json({ error: 'topic, sideA, sideB required' });
      return;
    }
    const { text } = await generateWithFallback({
      contents: `Moderate an async peer debate grounded in course material.
Topic: ${topic}
Material:
${material.slice(0, 20000)}

Side A argument:
${sideA}

Side B argument:
${sideB}`,
      apiKey: apiKeyOf(req),
      config: {
        responseMimeType: 'application/json',
        responseSchema: debateScoreSchema,
        systemInstruction:
          'Score 0-100 each side for accuracy vs material, logic, and coverage of edge cases. Note hallucinations.',
      },
    });
    const scored = JSON.parse(text.replace(/```json/gi, '').replace(/```/g, '').trim());
    const db = dbFor(req);
    if (db && req.body?.roomId) {
      try {
        await db.from('debate_rounds').insert({
          room_id: req.body.roomId,
          user_id: req.userId,
          topic,
          side_a: sideA,
          side_b: sideB,
          score: scored,
        });
      } catch {
        /* soft */
      }
    }
    res.json(scored);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Debate score failed' });
  }
});

/** POST /api/advanced/debate/rooms — create async debate room */
router.post('/debate/rooms', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const topic = String(req.body?.topic || '').trim();
    if (!topic) {
      res.status(400).json({ error: 'topic required' });
      return;
    }
    const { data, error } = await db
      .from('debate_rooms')
      .insert({
        owner_id: req.userId,
        topic,
        module_code: req.body?.moduleCode || null,
        material: req.body?.material || '',
        status: 'open',
      })
      .select('*')
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ room: data });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Create room failed' });
  }
});

/** GET /api/advanced/debate/rooms */
router.get('/debate/rooms', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const { data, error } = await db
      .from('debate_rooms')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ rooms: data || [] });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'List failed' });
  }
});

export default router;
