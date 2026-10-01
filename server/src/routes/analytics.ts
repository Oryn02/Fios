import { Router, Response } from 'express';
import { requireUser, type AuthedRequest } from '../middleware/requireUser.js';
import { getSupabaseAdmin, getSupabaseAsUser } from '../supabaseAdmin.js';

const router = Router();

function dbFor(req: AuthedRequest) {
  return getSupabaseAdmin() || getSupabaseAsUser(req.accessToken || '');
}

/**
 * GET /api/analytics/group/:groupId
 * Classroom / study-group aggregates for teachers and members.
 */
router.get('/group/:groupId', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const groupId = String(req.params.groupId || '').trim();
    const db = dbFor(req);
    if (!db || !groupId) {
      res.status(400).json({ error: 'groupId required' });
      return;
    }

    const { data: membership } = await db
      .from('group_members')
      .select('role, study_groups(*)')
      .eq('group_id', groupId)
      .eq('user_id', req.userId!)
      .maybeSingle();

    const group = (membership as any)?.study_groups;
    if (!membership || !group) {
      // Owner fallback if membership row missing
      const { data: owned } = await db
        .from('study_groups')
        .select('*')
        .eq('id', groupId)
        .eq('owner_id', req.userId!)
        .maybeSingle();
      if (!owned) {
        res.status(403).json({ error: 'Not a member of this group' });
        return;
      }
    }

    const { data: members } = await db
      .from('group_members')
      .select('user_id, role, joined_at')
      .eq('group_id', groupId);

    const memberIds = (members || []).map((m) => m.user_id);
    const admin = getSupabaseAdmin();
    const reader = admin || db;

    let streaks: any[] = [];
    let recentReviews: any[] = [];
    let quizScores: any[] = [];

    if (memberIds.length) {
      const { data: s } = await reader
        .from('user_streaks')
        .select('user_id, current_streak, longest_streak, xp, last_study_date')
        .in('user_id', memberIds);
      streaks = s || [];

      const since = new Date();
      since.setDate(since.getDate() - 14);
      const { data: r } = await reader
        .from('card_reviews')
        .select('user_id, rating, created_at, scheduler')
        .in('user_id', memberIds)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(500);
      recentReviews = r || [];

      const { data: sessions } = await reader
        .from('quiz_sessions')
        .select('id, title, status, created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(20);
      const sessionIds = (sessions || []).map((x) => x.id);
      if (sessionIds.length) {
        const { data: parts } = await reader
          .from('quiz_participants')
          .select('session_id, user_id, display_name, score, joined_at')
          .in('session_id', sessionIds);
        quizScores = (parts || []).map((p) => ({
          ...p,
          session: (sessions || []).find((s) => s.id === p.session_id),
        }));
      }
    }

    const reviewCounts: Record<string, number> = {};
    for (const r of recentReviews) {
      reviewCounts[r.user_id] = (reviewCounts[r.user_id] || 0) + 1;
    }

    const roster = (members || []).map((m) => {
      const st = streaks.find((x) => x.user_id === m.user_id);
      return {
        userId: m.user_id,
        role: m.role,
        joinedAt: m.joined_at,
        currentStreak: st?.current_streak ?? 0,
        longestStreak: st?.longest_streak ?? 0,
        xp: st?.xp ?? 0,
        lastStudyDate: st?.last_study_date ?? null,
        reviews14d: reviewCounts[m.user_id] || 0,
      };
    });

    res.json({
      group: group || (membership as any)?.study_groups,
      role: (membership as any)?.role || 'owner',
      roster,
      quizScores,
      reviewSample: recentReviews.slice(0, 50),
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Analytics failed' });
  }
});

export default router;
