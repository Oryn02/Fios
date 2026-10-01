import { Router, Response } from 'express';
import { requireUser, type AuthedRequest } from '../middleware/requireUser.js';
import { generateMindMapFromText, generateQuizFromText, saasGenerate } from '../geminiService.js';
import { getSupabaseAdmin, getSupabaseAsUser } from '../supabaseAdmin.js';

const router = Router();

function apiKeyOf(req: AuthedRequest): string | undefined {
  const headerKey = req.header('x-gemini-key');
  return (req.body && req.body.apiKey) || headerKey || undefined;
}

/** POST /api/mindmap/generate { text } */
router.post('/generate', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }
    const graph = await generateMindMapFromText(text, apiKeyOf(req));

    // Soft-persist when possible
    try {
      const db = getSupabaseAsUser(req.accessToken || '') || getSupabaseAdmin();
      if (db) {
        const { data } = await db
          .from('mind_maps')
          .insert({
            user_id: req.userId,
            title: graph.title,
            source_document_id: req.body?.documentId || null,
            graph,
          })
          .select('id')
          .maybeSingle();
        if (data?.id) {
          res.json({ ...graph, id: data.id });
          return;
        }
      }
    } catch (err) {
      console.warn('mind_maps persist soft-fail:', err);
    }

    res.json(graph);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Mind map failed' });
  }
});

/** POST /api/mindmap/node-quiz { label, summary, context? } */
router.post('/node-quiz', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const label = String(req.body?.label || '').trim();
    const summary = String(req.body?.summary || '').trim();
    const context = String(req.body?.context || '').trim();
    if (!label && !summary) {
      res.status(400).json({ error: 'label or summary is required' });
      return;
    }
    const material = `Concept: ${label}\nSummary: ${summary}\n${context ? `Context:\n${context}` : ''}`;
    try {
      const quiz = await generateQuizFromText(material, apiKeyOf(req), 3);
      res.json(quiz);
    } catch {
      const fallback = await saasGenerate({
        prompt: `Write one short open-ended study question about this concept and a model answer.\n\n${material}`,
        apiKey: apiKeyOf(req),
        system: 'Return plain text: Question: … then Answer: …',
      });
      res.json({
        quizTitle: label || 'Node quiz',
        questions: [],
        openEnded: fallback.text,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Node quiz failed' });
  }
});

export default router;
