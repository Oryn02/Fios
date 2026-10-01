import { Router, Response } from 'express';
import { requireUser, type AuthedRequest } from '../middleware/requireUser.js';
import { getSupabaseAdmin, getSupabaseAsUser } from '../supabaseAdmin.js';

const router = Router();

function dbFor(req: AuthedRequest) {
  return getSupabaseAsUser(req.accessToken || '') || getSupabaseAdmin();
}

/** POST /api/lms/connect */
router.post('/connect', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const provider = String(req.body?.provider || '').trim().toLowerCase();
    const baseUrl = String(req.body?.baseUrl || '').trim().replace(/\/+$/, '');
    const accessToken = String(req.body?.accessToken || '').trim();
    if (!['canvas', 'moodle', 'blackboard'].includes(provider) || !baseUrl || !accessToken) {
      res.status(400).json({ error: 'provider, baseUrl, and accessToken are required' });
      return;
    }
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const { data, error } = await db
      .from('lms_connections')
      .upsert(
        {
          user_id: req.userId,
          provider,
          base_url: baseUrl,
          display_name: req.body?.displayName || provider,
          access_token_enc: accessToken,
          last_synced_at: null,
        },
        { onConflict: 'user_id,provider,base_url' }
      )
      .select('id, provider, base_url, display_name, last_synced_at, created_at')
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ connection: data });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Connect failed' });
  }
});

/** GET /api/lms/connections */
router.get('/connections', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const { data, error } = await db
      .from('lms_connections')
      .select('id, provider, base_url, display_name, last_synced_at, created_at')
      .eq('user_id', req.userId!);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ connections: data || [] });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'List failed' });
  }
});

/** POST /api/lms/sync/:id — best-effort Canvas/Moodle pull */
router.post('/sync/:id', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const { data: conn, error } = await db
      .from('lms_connections')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .maybeSingle();
    if (error || !conn) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    const materials: Record<string, unknown>[] = [];
    const token = String(conn.access_token_enc || '');
    const base = String(conn.base_url || '').replace(/\/+$/, '');

    if (conn.provider === 'canvas') {
      const coursesRes = await fetch(`${base}/api/v1/courses?per_page=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const courses = (await coursesRes.json().catch(() => [])) as any[];
      if (!coursesRes.ok) {
        res.status(400).json({
          error:
            (courses as any)?.errors?.[0]?.message ||
            `Canvas sync failed (${coursesRes.status}). Check token & base URL.`,
        });
        return;
      }
      for (const c of Array.isArray(courses) ? courses.slice(0, 10) : []) {
        materials.push({
          user_id: req.userId,
          connection_id: conn.id,
          external_id: String(c.id),
          title: String(c.name || 'Course'),
          material_type: 'syllabus',
          course_name: String(c.name || ''),
          module_code: c.course_code || null,
          url: `${base}/courses/${c.id}`,
          content_text: c.syllabus_body ? String(c.syllabus_body).slice(0, 20000) : null,
          meta: { canvas: true },
        });
      }
    } else if (conn.provider === 'moodle') {
      const form = new URLSearchParams({
        wstoken: token,
        wsfunction: 'core_course_get_courses',
        moodlewsrestformat: 'json',
      });
      const moodleRes = await fetch(`${base}/webservice/rest/server.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
      const courses = (await moodleRes.json().catch(() => [])) as any[];
      if (!Array.isArray(courses)) {
        res.status(400).json({
          error: (courses as any)?.message || 'Moodle sync failed — check token & base URL.',
        });
        return;
      }
      for (const c of courses.slice(0, 15)) {
        materials.push({
          user_id: req.userId,
          connection_id: conn.id,
          external_id: String(c.id),
          title: String(c.fullname || c.shortname || 'Course'),
          material_type: 'syllabus',
          course_name: String(c.fullname || ''),
          module_code: c.shortname || null,
          url: `${base}/course/view.php?id=${c.id}`,
          content_text: c.summary ? String(c.summary).replace(/<[^>]+>/g, '').slice(0, 20000) : null,
          meta: { moodle: true },
        });
      }
    } else {
      // Blackboard — store connection; materials via manual URL list for MVP
      materials.push({
        user_id: req.userId,
        connection_id: conn.id,
        external_id: 'bb-root',
        title: 'Blackboard connection ready',
        material_type: 'page',
        course_name: conn.display_name || 'Blackboard',
        url: base,
        content_text:
          'Connected. Use Learn REST APIs with your institution token, or paste syllabus text into Smart Notes.',
        meta: { blackboard: true },
      });
    }

    if (materials.length) {
      await db.from('lms_materials').delete().eq('connection_id', conn.id);
      const { error: insErr } = await db.from('lms_materials').insert(materials);
      if (insErr) {
        res.status(400).json({ error: insErr.message });
        return;
      }
    }
    await db
      .from('lms_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', conn.id);

    const { data: rows } = await db
      .from('lms_materials')
      .select('*')
      .eq('connection_id', conn.id)
      .order('created_at', { ascending: false });
    res.json({ materials: rows || [], count: (rows || []).length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Sync failed' });
  }
});

/** GET /api/lms/materials */
router.get('/materials', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const { data, error } = await db
      .from('lms_materials')
      .select('*')
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ materials: data || [] });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'List failed' });
  }
});

/** POST /api/lms/prep-schedule — weekly exam prep heuristic */
router.post('/prep-schedule', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const { data: materials } = await db
      .from('lms_materials')
      .select('title, course_name, module_code, due_at, material_type')
      .eq('user_id', req.userId!)
      .limit(50);
    const weeks: { week: number; focus: string; tasks: string[] }[] = [];
    const list = materials || [];
    for (let w = 1; w <= 4; w++) {
      const slice = list.slice((w - 1) * 3, w * 3);
      weeks.push({
        week: w,
        focus: slice[0]?.course_name || slice[0]?.module_code || `Week ${w} review`,
        tasks: slice.length
          ? slice.map((m) => `Review ${m.title} (${m.material_type})`)
          : [`Active recall session ${w}`, `Interleaved practice across modules`, `Feynman teach-back`],
      });
    }
    res.json({ schedule: weeks });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Schedule failed' });
  }
});

export default router;
