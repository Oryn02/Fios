import { Router, Response } from 'express';
import { requireUser, type AuthedRequest } from '../middleware/requireUser.js';
import { getSupabaseAdmin, getSupabaseAsUser } from '../supabaseAdmin.js';

const router = Router();

function dbFor(req: AuthedRequest) {
  return getSupabaseAsUser(req.accessToken || '') || getSupabaseAdmin();
}

function inviteCode(len = 8): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveAddresseeId(input: {
  addresseeId?: string;
  userId?: string;
  email?: string;
  username?: string;
}): Promise<string | null> {
  const direct = String(input.addresseeId || input.userId || '').trim();
  if (direct && UUID_RE.test(direct)) return direct;

  const email = String(input.email || '').trim().toLowerCase();
  const username = String(input.username || '').trim();

  // If only a free-form id was sent (non-UUID), treat as username/email
  const maybeHandle = !direct
    ? ''
    : direct.includes('@')
      ? ''
      : direct;
  const emailCandidate = email || (direct.includes('@') ? direct.toLowerCase() : '');
  const usernameCandidate = username || maybeHandle;

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  if (emailCandidate) {
    try {
      const byEmail = await (admin.auth.admin as any).getUserByEmail?.(emailCandidate);
      const id = byEmail?.data?.user?.id || byEmail?.user?.id;
      if (id) return String(id);
    } catch {
      /* fall through to listUsers */
    }
    try {
      let page = 1;
      const perPage = 200;
      while (page <= 10) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error) break;
        const hit = (data?.users || []).find(
          (u) => String(u.email || '').toLowerCase() === emailCandidate
        );
        if (hit?.id) return hit.id;
        if (!data?.users?.length || data.users.length < perPage) break;
        page += 1;
      }
    } catch {
      /* ignore */
    }
  }

  if (usernameCandidate) {
    const needle = usernameCandidate;
    const { data: byPreferred } = await admin
      .from('user_profiles')
      .select('id')
      .ilike('preferred_name', needle)
      .limit(1)
      .maybeSingle();
    if (byPreferred?.id) return String(byPreferred.id);

    const { data: byFull } = await admin
      .from('user_profiles')
      .select('id')
      .ilike('full_name', needle)
      .limit(1)
      .maybeSingle();
    if (byFull?.id) return String(byFull.id);
  }

  return null;
}

/** POST /api/social/friends/request — body: { email?, addresseeId?, username? } */
router.post('/friends/request', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const hasInput = Boolean(
      String(req.body?.addresseeId || '').trim() ||
        String(req.body?.userId || '').trim() ||
        String(req.body?.email || '').trim() ||
        String(req.body?.username || '').trim()
    );
    if (!hasInput) {
      res.status(400).json({ error: 'email, username, or addresseeId required' });
      return;
    }
    const addresseeId = await resolveAddresseeId({
      addresseeId: req.body?.addresseeId,
      userId: req.body?.userId,
      email: req.body?.email,
      username: req.body?.username,
    });
    if (!addresseeId) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (addresseeId === req.userId) {
      res.status(400).json({ error: 'Cannot friend yourself' });
      return;
    }
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const { data, error } = await db
      .from('friendships')
      .upsert(
        {
          requester_id: req.userId,
          addressee_id: addresseeId,
          status: 'pending',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'requester_id,addressee_id' }
      )
      .select('*')
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ friendship: data });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Request failed' });
  }
});

/** POST /api/social/friends/respond — accept | decline | block */
router.post('/friends/respond', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const friendshipId = String(req.body?.friendshipId || '').trim();
    const status = String(req.body?.status || '').trim();
    if (!friendshipId || !['accepted', 'declined', 'blocked'].includes(status)) {
      res.status(400).json({ error: 'friendshipId and status (accepted|declined|blocked) required' });
      return;
    }
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const { data, error } = await db
      .from('friendships')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', friendshipId)
      .eq('addressee_id', req.userId!)
      .select('*')
      .maybeSingle();
    if (error || !data) {
      res.status(404).json({ error: error?.message || 'Friendship not found' });
      return;
    }
    res.json({ friendship: data });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Respond failed' });
  }
});

/** GET /api/social/friends */
router.get('/friends', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const uid = req.userId!;
    const { data, error } = await db
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)
      .order('updated_at', { ascending: false });
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ friendships: data || [] });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'List failed' });
  }
});

/** POST /api/social/share — insert shared_resources */
router.post('/share', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const title = String(req.body?.title || '').trim();
    const resourceType = String(req.body?.resourceType || '').trim();
    const visibility = String(req.body?.visibility || 'friends').trim();
    if (!title || !['deck', 'document', 'quiz', 'module', 'link'].includes(resourceType)) {
      res.status(400).json({ error: 'title and resourceType required' });
      return;
    }
    if (!['private', 'friends', 'group', 'course_bank'].includes(visibility)) {
      res.status(400).json({ error: 'Invalid visibility' });
      return;
    }
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const { data, error } = await db
      .from('shared_resources')
      .insert({
        owner_id: req.userId,
        resource_type: resourceType,
        resource_id: req.body?.resourceId || null,
        title,
        module_code: req.body?.moduleCode || null,
        payload: req.body?.payload || {},
        visibility,
        group_id: req.body?.groupId || null,
      })
      .select('*')
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ resource: data });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Share failed' });
  }
});

/** GET /api/social/course-bank?moduleCode= */
router.get('/course-bank', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    let q = db
      .from('shared_resources')
      .select(
        'id, owner_id, resource_type, resource_id, title, module_code, payload, visibility, group_id, created_at, view_count, clone_count, upvote_count, downvote_count'
      )
      .eq('visibility', 'course_bank')
      .order('created_at', { ascending: false })
      .limit(100);
    const moduleCode = String(req.query.moduleCode || '').trim();
    if (moduleCode) q = q.eq('module_code', moduleCode);
    const { data, error } = await q;
    if (error) {
      // Soft-fallback if new columns missing
      const fallback = await db
        .from('shared_resources')
        .select('*')
        .eq('visibility', 'course_bank')
        .order('created_at', { ascending: false })
        .limit(100);
      if (fallback.error) {
        res.status(400).json({ error: error.message });
        return;
      }
      let rows = fallback.data || [];
      if (moduleCode) rows = rows.filter((r: any) => r.module_code === moduleCode);
      res.json({ resources: rows });
      return;
    }
    res.json({ resources: data || [] });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Course bank failed' });
  }
});

/** POST /api/social/course-bank/:id/view */
router.post('/course-bank/:id/view', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) {
      res.status(400).json({ error: 'id required' });
      return;
    }
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const { data, error } = await db.rpc('fios_record_resource_view', {
      p_resource_id: id,
    });
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ resource: data });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'View failed' });
  }
});

/** POST /api/social/course-bank/:id/vote { vote: 1|-1 } */
router.post('/course-bank/:id/vote', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const id = String(req.params.id || '').trim();
    const vote = Number(req.body?.vote);
    if (!id || ![1, -1].includes(vote)) {
      res.status(400).json({ error: 'id and vote (1|-1) required' });
      return;
    }
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const { data, error } = await db.rpc('fios_vote_resource', {
      p_resource_id: id,
      p_vote: vote,
    });
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ resource: data });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Vote failed' });
  }
});

/** POST /api/social/course-bank/:id/clone */
router.post('/course-bank/:id/clone', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) {
      res.status(400).json({ error: 'id required' });
      return;
    }
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const { data, error } = await db.rpc('fios_clone_shared_deck', {
      p_resource_id: id,
    });
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ clone: data });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Clone failed' });
  }
});

/** POST /api/social/groups — create study/classroom group */
router.post('/groups', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const code = inviteCode(8);
    const { data: group, error } = await db
      .from('study_groups')
      .insert({
        owner_id: req.userId,
        name,
        description: req.body?.description || null,
        is_classroom: Boolean(req.body?.isClassroom),
        invite_code: code,
      })
      .select('*')
      .single();
    if (error || !group) {
      res.status(400).json({ error: error?.message || 'Create failed' });
      return;
    }
    await db.from('group_members').insert({
      group_id: group.id,
      user_id: req.userId,
      role: 'owner',
    });
    res.json({ group });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Group create failed' });
  }
});

/** POST /api/social/groups/join */
router.post('/groups/join', requireUser, async (req: AuthedRequest, res: Response) => {
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
    const { data: group } = await db
      .from('study_groups')
      .select('*')
      .eq('invite_code', code)
      .maybeSingle();
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }
    const { error } = await db.from('group_members').upsert({
      group_id: group.id,
      user_id: req.userId,
      role: 'member',
    });
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ group });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Join failed' });
  }
});

/** GET /api/social/groups */
router.get('/groups', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const { data: memberships } = await db
      .from('group_members')
      .select('group_id, role, study_groups(*)')
      .eq('user_id', req.userId!);
    const groups = (memberships || []).map((m: any) => ({
      ...m.study_groups,
      role: m.role,
    }));
    res.json({ groups });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'List groups failed' });
  }
});

export default router;
