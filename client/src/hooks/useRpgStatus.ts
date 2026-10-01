import { useCallback, useEffect, useState } from 'react';
import { IS_DEMO } from '../lib/demo';
import { levelFromXp } from '../lib/rpg';
import { getUnlockedRewards } from '../components/rpg/RpgProgressPanel';
import { fetchRpgStatus, type RpgStatus } from '../services/rpgApi';
import { supabase } from '../lib/supabase';

const DEMO_STATUS: RpgStatus = {
  streak: {
    current_streak: 3,
    longest_streak: 7,
    xp: 120,
    skill_points: 8,
    unlocked_rewards: getUnlockedRewards(),
  },
  xp: 120,
  level: levelFromXp(120),
  skill_points: 8,
  unlocked_rewards: getUnlockedRewards(),
  streak_freeze_until: null,
};

export function useRpgStatus(pollMs = 0) {
  const [status, setStatus] = useState<RpgStatus | null>(IS_DEMO ? DEMO_STATUS : null);
  const [loading, setLoading] = useState(!IS_DEMO);

  const refresh = useCallback(async () => {
    if (IS_DEMO) {
      setStatus(DEMO_STATUS);
      setLoading(false);
      return DEMO_STATUS;
    }
    try {
      const data = await fetchRpgStatus();
      setStatus(data);
      try {
        localStorage.setItem('fios_unlocked_rewards', JSON.stringify(data.unlocked_rewards || []));
      } catch {
        /* ignore */
      }
      return data;
    } catch {
      // Soft fallback: read user_streaks directly
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setStatus(null);
          return null;
        }
        const { data } = await supabase.from('user_streaks').select('*').eq('user_id', user.id).maybeSingle();
        const xp = Number(data?.xp) || 0;
        const next: RpgStatus = {
          streak: data,
          xp,
          level: levelFromXp(xp),
          skill_points: Number(data?.skill_points) || 0,
          unlocked_rewards: Array.isArray(data?.unlocked_rewards)
            ? data.unlocked_rewards.map(String)
            : getUnlockedRewards(),
          streak_freeze_until: data?.streak_freeze_until || null,
        };
        setStatus(next);
        return next;
      } catch {
        setStatus({
          streak: null,
          xp: 0,
          level: 1,
          skill_points: 0,
          unlocked_rewards: getUnlockedRewards(),
          streak_freeze_until: null,
        });
        return null;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!pollMs || pollMs < 5_000) return;
    const id = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(id);
  }, [pollMs, refresh]);

  return { status, loading, refresh };
}
