import { Router, Response } from 'express';
import { requireUser, type AuthedRequest } from '../middleware/requireUser.js';
import { getSupabaseAdmin, getSupabaseAsUser } from '../supabaseAdmin.js';

const router = Router();

const REWARDS: Record<string, { cost: number; label: string }> = {
  weekend_freeze: { cost: 3, label: 'Weekend streak freeze' },
  lobby_gold: { cost: 5, label: 'Gold lobby border' },
  theme_night_owl: { cost: 4, label: 'Night Owl theme' },
  theme_forest: { cost: 4, label: 'Forest theme' },
};

function levelFromXp(xp: number): number {
  const safe = Math.max(0, Number(xp) || 0);
  return 1 + Math.floor(Math.sqrt(safe / 50));
}

function dbFor(req: AuthedRequest) {
  return getSupabaseAdmin() || getSupabaseAsUser(req.accessToken || '');
}

async function ensureStreakRow(userId: string, db: NonNullable<ReturnType<typeof dbFor>>) {
  const { data } = await db.from('user_streaks').select('*').eq('user_id', userId).maybeSingle();
  if (data) return data;
  const { data: created } = await db
    .from('user_streaks')
    .upsert({
      user_id: userId,
      current_streak: 0,
      longest_streak: 0,
      xp: 0,
      skill_points: 0,
      unlocked_rewards: [],
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  return created;
}

/** GET /api/rpg/status */
router.get('/status', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const row = await ensureStreakRow(req.userId!, db);
    const xp = Number(row?.xp) || 0;
    const unlocked = Array.isArray(row?.unlocked_rewards) ? row.unlocked_rewards : [];
    res.json({
      streak: row || null,
      xp,
      level: levelFromXp(xp),
      skill_points: Number(row?.skill_points) || 0,
      unlocked_rewards: unlocked,
      streak_freeze_until: row?.streak_freeze_until || null,
      catalog: Object.entries(REWARDS).map(([id, meta]) => ({
        id,
        ...meta,
        unlocked: unlocked.includes(id),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Status failed' });
  }
});

/** POST /api/rpg/unlock { rewardId } */
router.post('/unlock', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const rewardId = String(req.body?.rewardId || '').trim();
    const reward = REWARDS[rewardId];
    if (!reward) {
      res.status(400).json({ error: 'Unknown rewardId' });
      return;
    }
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const row = await ensureStreakRow(req.userId!, db);
    const unlocked: string[] = Array.isArray(row?.unlocked_rewards)
      ? [...row.unlocked_rewards]
      : [];
    if (unlocked.includes(rewardId)) {
      res.json({ ok: true, alreadyUnlocked: true, unlocked_rewards: unlocked, skill_points: Number(row?.skill_points) || 0 });
      return;
    }
    const points = Number(row?.skill_points) || 0;
    if (points < reward.cost) {
      res.status(400).json({ error: 'Not enough skill points', need: reward.cost, have: points });
      return;
    }
    unlocked.push(rewardId);
    const patch: Record<string, unknown> = {
      skill_points: points - reward.cost,
      unlocked_rewards: unlocked,
      updated_at: new Date().toISOString(),
    };
    if (rewardId === 'lobby_gold') patch.lobby_border = 'gold';
    if (rewardId.startsWith('theme_')) patch.active_theme_unlock = rewardId;

    const { data, error } = await db
      .from('user_streaks')
      .update(patch)
      .eq('user_id', req.userId!)
      .select('*')
      .single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({
      ok: true,
      rewardId,
      skill_points: Number(data?.skill_points) || 0,
      unlocked_rewards: data?.unlocked_rewards || unlocked,
      streak: data,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unlock failed' });
  }
});

/** POST /api/rpg/freeze — weekend streak freeze if unlocked */
router.post('/freeze', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const db = dbFor(req);
    if (!db) {
      res.status(503).json({ error: 'Database not configured' });
      return;
    }
    const row = await ensureStreakRow(req.userId!, db);
    const unlocked: string[] = Array.isArray(row?.unlocked_rewards) ? row.unlocked_rewards : [];
    if (!unlocked.includes('weekend_freeze')) {
      res.status(403).json({ error: 'Unlock weekend_freeze first' });
      return;
    }

    const now = new Date();
    const day = now.getUTCDay(); // 0 Sun … 6 Sat
    if (day !== 0 && day !== 6 && day !== 5) {
      // Allow Fri–Sun activation for the upcoming weekend
      res.status(400).json({ error: 'Streak freeze can be activated Friday–Sunday only' });
      return;
    }

    // Freeze through end of upcoming/current Sunday
    const until = new Date(now);
    const daysUntilSunday = (7 - until.getUTCDay()) % 7;
    until.setUTCDate(until.getUTCDate() + daysUntilSunday);
    const freezeDate = until.toISOString().slice(0, 10);

    if (row?.streak_freeze_until && String(row.streak_freeze_until).slice(0, 10) >= freezeDate) {
      res.json({ ok: true, alreadyActive: true, streak_freeze_until: row.streak_freeze_until });
      return;
    }

    const { data, error } = await db
      .from('user_streaks')
      .update({
        streak_freeze_until: freezeDate,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', req.userId!)
      .select('*')
      .single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true, streak_freeze_until: data?.streak_freeze_until || freezeDate, streak: data });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Freeze failed' });
  }
});

export default router;
