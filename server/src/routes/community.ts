/**
 * Community / macros / gauntlet / peer-review swipe (features 41–45 server side).
 */
import { Router, Response } from 'express';
import { Type } from '@google/genai';
import { requireUser, type AuthedRequest } from '../middleware/requireUser.js';
import { generateWithFallback, generateFlashcardsFromText } from '../geminiService.js';
import { getSupabaseAdmin, getSupabaseAsUser } from '../supabaseAdmin.js';

const router = Router();

function apiKeyOf(req: AuthedRequest): string | undefined {
  return (req.body && req.body.apiKey) || req.header('x-gemini-key') || undefined;
}

function dbFor(req: AuthedRequest) {
  return getSupabaseAsUser(req.accessToken || '') || getSupabaseAdmin();
}

const diagnosticSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    weakTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
    remediationBullets: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['summary', 'weakTopics', 'remediationBullets'],
};

/** POST /api/community/macros/log — Recall / Synthesis / Application */
router.post('/macros/log', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const kind = String(req.body?.kind || '').trim().toLowerCase();
    if (!['recall', 'synthesis', 'application'].includes(kind)) {
      res.status(400).json({ error: 'kind must be recall | synthesis | application' });
      return;
    }
    const amount = Math.max(1, Math.min(50, Number(req.body?.amount) || 1));
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const day = new Date().toISOString().slice(0, 10);
    const { data: existing } = await db
      .from('learning_macros')
      .select('*')
      .eq('user_id', req.userId!)
      .eq('day', day)
      .maybeSingle();
    const row = {
      user_id: req.userId,
      day,
      recall: Number(existing?.recall || 0) + (kind === 'recall' ? amount : 0),
      synthesis: Number(existing?.synthesis || 0) + (kind === 'synthesis' ? amount : 0),
      application: Number(existing?.application || 0) + (kind === 'application' ? amount : 0),
      target_recall: Number(existing?.target_recall || req.body?.targetRecall || 20),
      target_synthesis: Number(existing?.target_synthesis || req.body?.targetSynthesis || 5),
      target_application: Number(existing?.target_application || req.body?.targetApplication || 5),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await db
      .from('learning_macros')
      .upsert(row, { onConflict: 'user_id,day' })
      .select('*')
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ macros: data });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Macro log failed' });
  }
});

/** GET /api/community/macros/today */
router.get('/macros/today', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const day = new Date().toISOString().slice(0, 10);
    const { data } = await db
      .from('learning_macros')
      .select('*')
      .eq('user_id', req.userId!)
      .eq('day', day)
      .maybeSingle();
    res.json({
      macros: data || {
        day,
        recall: 0,
        synthesis: 0,
        application: 0,
        target_recall: 20,
        target_synthesis: 5,
        target_application: 5,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Macro fetch failed' });
  }
});

/** POST /api/community/gauntlet/start — pull progressive Course Bank cards */
router.post('/gauntlet/start', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const moduleCode = String(req.body?.moduleCode || '').trim();
    let q = db
      .from('shared_resources')
      .select('*')
      .eq('visibility', 'course_bank')
      .eq('resource_type', 'deck')
      .order('upvote_count', { ascending: false })
      .limit(12);
    if (moduleCode) q = q.eq('module_code', moduleCode);
    const { data: resources } = await q;
    const cards: { front: string; back: string; difficulty: number; source?: string }[] = [];
    for (const r of resources || []) {
      const payloadCards = Array.isArray((r as any).payload?.cards)
        ? (r as any).payload.cards
        : [];
      payloadCards.slice(0, 8).forEach((c: any, i: number) => {
        cards.push({
          front: String(c.front || c.question || ''),
          back: String(c.back || c.answer || ''),
          difficulty: Math.min(5, 1 + Math.floor(i / 2) + (Number(r.upvote_count) > 5 ? 1 : 0)),
          source: r.title,
        });
      });
    }
    cards.sort((a, b) => a.difficulty - b.difficulty);
    const session = {
      lives: 3,
      cards: cards.slice(0, 30),
      index: 0,
    };
    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gauntlet failed' });
  }
});

/** POST /api/community/gauntlet/death — diagnostic + remediation deck */
router.post('/gauntlet/death', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const missed = Array.isArray(req.body?.missed) ? req.body.missed : [];
    const material = missed
      .map((m: any) => `Q: ${m.front}\nA: ${m.back}`)
      .join('\n\n')
      .slice(0, 20000);
    const { text } = await generateWithFallback({
      contents: `Player died in a study gauntlet. Build a post-death diagnostic from missed cards:\n\n${material || '(no misses logged)'}`,
      apiKey: apiKeyOf(req),
      config: {
        responseMimeType: 'application/json',
        responseSchema: diagnosticSchema,
        systemInstruction: 'Be a tough but helpful coach. Identify weak topics and remediation bullets.',
      },
    });
    const diagnostic = JSON.parse(text.replace(/```json/gi, '').replace(/```/g, '').trim());
    const deck = await generateFlashcardsFromText(
      `Remediation deck:\n${(diagnostic.remediationBullets || []).join('\n')}\n\nMisses:\n${material}`,
      apiKeyOf(req)
    );
    res.json({ diagnostic, deck });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Diagnostic failed' });
  }
});

/** POST /api/community/peer-review/swipe — Tinder-style QA on public cards */
router.post('/peer-review/swipe', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const resourceId = String(req.body?.resourceId || '').trim();
    const cardIndex = Number(req.body?.cardIndex);
    const verdict = String(req.body?.verdict || '').trim(); // approve | reject
    if (!resourceId || !['approve', 'reject'].includes(verdict)) {
      res.status(400).json({ error: 'resourceId and verdict (approve|reject) required' });
      return;
    }
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    await db.from('peer_card_reviews').upsert(
      {
        resource_id: resourceId,
        card_index: Number.isFinite(cardIndex) ? cardIndex : 0,
        user_id: req.userId,
        verdict,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'resource_id,card_index,user_id' }
    );

    // Recompute community_verified when enough approvals
    const { count: approveCount } = await db
      .from('peer_card_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('resource_id', resourceId)
      .eq('verdict', 'approve');
    const verified = (approveCount || 0) >= 3;
    if (verified) {
      await db
        .from('shared_resources')
        .update({
          community_verified: true,
          directory_boost: 10,
        })
        .eq('id', resourceId);
    }
    res.json({ ok: true, communityVerified: verified, approveCount: approveCount || 0 });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Swipe failed' });
  }
});

/** GET /api/community/peer-review/queue — cards awaiting swipe */
router.get('/peer-review/queue', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const { data } = await db
      .from('shared_resources')
      .select('id, title, module_code, payload, upvote_count, community_verified, clone_count, view_count')
      .eq('visibility', 'course_bank')
      .eq('resource_type', 'deck')
      .order('created_at', { ascending: false })
      .limit(20);
    const queue: any[] = [];
    for (const r of data || []) {
      const cards = Array.isArray((r as any).payload?.cards) ? (r as any).payload.cards : [];
      cards.slice(0, 3).forEach((c: any, i: number) => {
        queue.push({
          resourceId: r.id,
          cardIndex: i,
          title: r.title,
          moduleCode: r.module_code,
          front: c.front || c.question,
          back: c.back || c.answer,
          communityVerified: Boolean((r as any).community_verified),
        });
      });
    }
    res.json({ queue: queue.slice(0, 40) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Queue failed' });
  }
});

export default router;
