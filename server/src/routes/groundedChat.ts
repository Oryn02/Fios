import { Router, Response } from 'express';
import { requireUser, type AuthedRequest } from '../middleware/requireUser.js';
import { groundedDocumentChat, chunkText, vivaCoachTurn } from '../geminiService.js';
import { getSupabaseAdmin, getSupabaseAsUser } from '../supabaseAdmin.js';

const router = Router();

function apiKeyOf(req: AuthedRequest): string | undefined {
  return (req.body && req.body.apiKey) || req.header('x-gemini-key') || undefined;
}

function dbFor(req: AuthedRequest) {
  return getSupabaseAsUser(req.accessToken || '') || getSupabaseAdmin();
}

/** POST /api/grounded/ask */
router.post('/ask', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const question = String(req.body?.question || '').trim();
    if (!question) {
      res.status(400).json({ error: 'question required' });
      return;
    }
    const db = dbFor(req);
    let passages: { text: string; page?: number; paragraph?: number; chunkIndex?: number }[] = [];

    if (Array.isArray(req.body?.chunks) && req.body.chunks.length) {
      passages = req.body.chunks.map((c: any, i: number) =>
        typeof c === 'string'
          ? { text: c, chunkIndex: i }
          : {
              text: String(c.text || c.content || ''),
              page: c.page_number ?? c.page,
              paragraph: c.paragraph_index ?? c.paragraph,
              chunkIndex: c.chunk_index ?? i,
            }
      );
    } else if (db) {
      let q = db
        .from('note_chunks')
        .select('content, page_number, paragraph_index, chunk_index, document_id')
        .eq('user_id', req.userId!)
        .limit(80);
      if (req.body?.documentId) q = q.eq('document_id', String(req.body.documentId));
      const { data } = await q;
      passages = (data || []).map((r: any, i: number) => ({
        text: r.content,
        page: r.page_number ?? undefined,
        paragraph: r.paragraph_index ?? undefined,
        chunkIndex: r.chunk_index ?? i,
      }));
      if (!passages.length && req.body?.text) {
        passages = chunkText(String(req.body.text), 400, 40).map((t, i) => ({
          text: t,
          chunkIndex: i,
        }));
      }
    }

    if (!passages.length) {
      res.status(400).json({ error: 'No passages — index notes or pass chunks/text' });
      return;
    }

    const result = await groundedDocumentChat({
      question,
      passages,
      apiKey: apiKeyOf(req),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Grounded chat failed' });
  }
});

export default router;
