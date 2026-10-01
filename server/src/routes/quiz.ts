import { Router, Response } from 'express';
import { requireUser, type AuthedRequest } from '../middleware/requireUser.js';
import { getSupabaseAdmin, getSupabaseAsUser } from '../supabaseAdmin.js';

const router = Router();

function dbFor(req: AuthedRequest) {
  return getSupabaseAsUser(req.accessToken || '') || getSupabaseAdmin();
}

function inviteCode(len = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

/** POST /api/quiz/create — live multiplayer lobby (does not touch /generate/quiz). */
router.post('/create', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const title = String(req.body?.title || 'Live quiz').trim() || 'Live quiz';
    const questions = Array.isArray(req.body?.questions) ? req.body.questions : [];
    if (!questions.length) {
      res.status(400).json({ error: 'questions array required' });
      return;
    }
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const code = inviteCode(6);
    const { data, error } = await db
      .from('quiz_sessions')
      .insert({
        host_id: req.userId,
        group_id: req.body?.groupId || null,
        title,
        questions,
        status: 'lobby',
        invite_code: code,
      })
      .select('*')
      .single();
    if (error || !data) {
      res.status(400).json({ error: error?.message || 'Create failed' });
      return;
    }
    await db.from('quiz_participants').insert({
      session_id: data.id,
      user_id: req.userId,
      display_name: req.body?.displayName || 'Host',
      score: 0,
      answers: [],
    });
    res.json({ session: data });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Create failed' });
  }
});

/** POST /api/quiz/join */
router.post('/join', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const code = String(req.body?.inviteCode || '').trim().toUpperCase();
    if (!code) {
      res.status(400).json({ error: 'inviteCode required' });
      return;
    }
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const { data: session } = await db
      .from('quiz_sessions')
      .select('*')
      .eq('invite_code', code)
      .maybeSingle();
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    if (session.status === 'finished' || session.status === 'cancelled') {
      res.status(400).json({ error: 'Session is closed' });
      return;
    }
    await db.from('quiz_participants').upsert({
      session_id: session.id,
      user_id: req.userId,
      display_name: req.body?.displayName || 'Player',
    });
    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Join failed' });
  }
});

/** POST /api/quiz/start — host only */
router.post('/start', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const sessionId = String(req.body?.sessionId || '').trim();
    const db = dbFor(req);
    if (!db || !sessionId) {
      res.status(400).json({ error: 'sessionId required' });
      return;
    }
    const { data, error } = await db
      .from('quiz_sessions')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('host_id', req.userId!)
      .select('*')
      .maybeSingle();
    if (error || !data) {
      res.status(404).json({ error: error?.message || 'Not found' });
      return;
    }
    res.json({ session: data });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Start failed' });
  }
});

/** POST /api/quiz/submit — answer batch + score */
router.post('/submit', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const sessionId = String(req.body?.sessionId || '').trim();
    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId required' });
      return;
    }
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const { data: session } = await db
      .from('quiz_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    const questions = Array.isArray(session.questions) ? session.questions : [];
    let score = 0;
    for (const a of answers) {
      const q = questions.find((qq: any) => String(qq.id) === String(a.questionId));
      if (!q) continue;
      const correct =
        typeof q.correctIndex === 'number'
          ? Number(a.selectedIndex) === q.correctIndex
          : String(a.answer || '').trim().toLowerCase() === String(q.answer || '').trim().toLowerCase();
      if (correct) score += 1;
    }
    const { data, error } = await db
      .from('quiz_participants')
      .update({ score, answers })
      .eq('session_id', sessionId)
      .eq('user_id', req.userId!)
      .select('*')
      .maybeSingle();
    if (error || !data) {
      res.status(400).json({ error: error?.message || 'Submit failed' });
      return;
    }
    res.json({ participant: data, score, total: questions.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Submit failed' });
  }
});

/** GET /api/quiz/:id — session + participants */
router.get('/:id', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const id = String(req.params.id);
    const { data: session } = await db.from('quiz_sessions').select('*').eq('id', id).maybeSingle();
    if (!session) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const { data: participants } = await db
      .from('quiz_participants')
      .select('*')
      .eq('session_id', id)
      .order('score', { ascending: false });
    res.json({ session, participants: participants || [] });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Fetch failed' });
  }
});

export default router;
