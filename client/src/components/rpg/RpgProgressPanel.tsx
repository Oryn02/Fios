import React, { useCallback, useEffect, useState } from 'react';
import { Flame, Lock, Snowflake, Sparkles, Unlock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LOCKED_ACCENTS, type AccentKey, type UserStreak } from '../../types/db';
import { useTheme } from '../../context/ThemeContext';
import { toast } from '../../lib/toast';
import { IS_DEMO } from '../../lib/demo';
import {
  listRpgThemeUnlocks,
  rewardsIncludeTheme,
  type RpgThemeUnlock,
} from '../../lib/rpgThemeRegistry';
import {
  collectStudyMetrics,
  evaluateAndGrantThemeUnlocks,
  readLocalRewards,
} from '../../lib/studyMilestones';
import { isThemeUnlockedByMetrics, type StudyMetrics } from '../../lib/rpgThemeRegistry';
import { IMMERSIVE_THEMES } from '../../lib/rpgThemeRegistry';

const THEME_UNLOCKS = listRpgThemeUnlocks();

function parseRewards(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function getUnlockedRewards(): string[] {
  try {
    const local = localStorage.getItem('fios_unlocked_rewards');
    if (local) {
      const p = JSON.parse(local);
      if (Array.isArray(p)) return p.map(String);
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function isAccentUnlocked(key: AccentKey): boolean {
  if (!LOCKED_ACCENTS.has(key)) return true;
  const rewards = getUnlockedRewards();
  return rewardsIncludeTheme(rewards, key);
}

export const RpgProgressPanel: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { setAccent, accent } = useTheme();
  const [streak, setStreak] = useState<Partial<UserStreak> | null>(null);
  const [busy, setBusy] = useState(false);
  const [metrics, setMetrics] = useState<StudyMetrics>({});

  const load = useCallback(async () => {
    if (IS_DEMO) {
      setStreak({ xp: 120, skill_points: 8, current_streak: 3, unlocked_rewards: getUnlockedRewards() });
      const m = await collectStudyMetrics({ xp: 120, streakDays: 3 });
      setMetrics(m);
      await evaluateAndGrantThemeUnlocks({ xp: 120, streakDays: 3 });
      return;
    }
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('user_streaks').select('*').eq('user_id', user.id).maybeSingle();
      if (data) {
        setStreak(data);
        const rewards = parseRewards(data.unlocked_rewards);
        try {
          localStorage.setItem('fios_unlocked_rewards', JSON.stringify(rewards));
        } catch {
          /* ignore */
        }
        const m = await collectStudyMetrics({
          xp: Number(data.xp) || 0,
          streakDays: Number(data.current_streak) || 0,
        });
        setMetrics(m);
        const newly = await evaluateAndGrantThemeUnlocks({
          xp: Number(data.xp) || 0,
          streakDays: Number(data.current_streak) || 0,
        });
        if (newly.length) {
          const merged = [...new Set([...rewards, ...newly.map((t) => t.reward)])];
          try {
            localStorage.setItem('fios_unlocked_rewards', JSON.stringify(merged));
          } catch {
            /* ignore */
          }
          setStreak((s) => ({ ...s, unlocked_rewards: merged }));
          await supabase
            .from('user_streaks')
            .upsert({
              user_id: user.id,
              unlocked_rewards: merged,
              xp: data.xp,
              skill_points: data.skill_points,
              current_streak: data.current_streak,
              longest_streak: data.longest_streak,
            } as any);
        }
      } else {
        setStreak({ xp: 0, skill_points: 0, current_streak: 0, unlocked_rewards: [] });
        setMetrics(await collectStudyMetrics());
      }
    } catch {
      setStreak({ xp: 0, skill_points: 0, current_streak: 0, unlocked_rewards: getUnlockedRewards() });
      setMetrics(await collectStudyMetrics());
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rewards = parseRewards(streak?.unlocked_rewards).length
    ? parseRewards(streak?.unlocked_rewards)
    : getUnlockedRewards().length
      ? getUnlockedRewards()
      : readLocalRewards();
  const sp = streak?.skill_points ?? 0;
  const xp = streak?.xp ?? 0;

  const applyOrReveal = async (t: RpgThemeUnlock) => {
    const immersive = IMMERSIVE_THEMES.find((x) => x.id === t.immersiveId);
    const unlocked =
      rewardsIncludeTheme(rewards, t.key) ||
      rewards.includes(t.reward) ||
      (immersive ? isThemeUnlockedByMetrics(immersive, metrics) : false);
    if (!unlocked) {
      toast(t.unlockHint, 'info');
      return;
    }
    setBusy(true);
    try {
      const nextRewards = rewardsIncludeTheme(rewards, t.key)
        ? rewards
        : [...rewards, t.reward];
      try {
        localStorage.setItem('fios_unlocked_rewards', JSON.stringify(nextRewards));
      } catch {
        /* ignore */
      }
      if (!IS_DEMO) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('user_streaks')
            .upsert({
              user_id: user.id,
              unlocked_rewards: nextRewards,
              xp,
              skill_points: sp,
              current_streak: streak?.current_streak ?? 0,
              longest_streak: streak?.longest_streak ?? 0,
            } as any);
        }
      }
      setStreak((s) => ({ ...s, unlocked_rewards: nextRewards }));
      setAccent(t.key);
      toast(`${t.label} applied`, 'success');
    } catch (e: any) {
      toast(e?.message || 'Apply failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const activateFocusBuff = async () => {
    if (sp < 3) {
      toast('Need 3 skill points for Focus Buff', 'info');
      return;
    }
    setBusy(true);
    try {
      const until = new Date();
      until.setDate(until.getDate() + ((7 - until.getDay()) % 7 || 7));
      const iso = until.toISOString().slice(0, 10);
      const nextSp = sp - 3;
      if (!IS_DEMO) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('user_streaks')
            .upsert({
              user_id: user.id,
              skill_points: nextSp,
              streak_freeze_until: iso,
              unlocked_rewards: rewards,
              xp,
              current_streak: streak?.current_streak ?? 0,
              longest_streak: streak?.longest_streak ?? 0,
            } as any);
        }
      }
      setStreak((s) => ({ ...s, skill_points: nextSp, streak_freeze_until: iso }));
      toast(`Focus Buff active until ${iso}`, 'success');
    } catch (e: any) {
      toast(e?.message || 'Buff failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (compact) {
    return (
      <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 accent-solid-text shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-mono font-black uppercase tracking-widest accent-solid-text">RPG</p>
            <p className="text-xs font-bold text-[var(--fios-text)] truncate">
              {xp} XP · {sp} SP · 🔥 {streak?.current_streak ?? 0}
            </p>
          </div>
        </div>
        {LOCKED_ACCENTS.has(accent) ? (
          <span className="text-[9px] font-mono uppercase accent-solid-text shrink-0">{accent}</span>
        ) : (
          <Lock className="w-3.5 h-3.5 text-[var(--fios-text-muted)] shrink-0" />
        )}
      </div>
    );
  }

  return (
    <div className="bg-[var(--fios-surface)] border fios-border rounded-xl p-4 space-y-3 shadow-sm dark:shadow-none">
      <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
        <Flame className="w-4 h-4 accent-solid-text" /> Roguelike progress
      </h3>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-[var(--fios-surface-2)] border fios-border p-2">
          <p className="text-[9px] font-mono uppercase text-[var(--fios-text-muted)]">XP</p>
          <p className="text-sm font-black text-[var(--fios-text)]">{xp}</p>
        </div>
        <div className="rounded-lg bg-[var(--fios-surface-2)] border fios-border p-2">
          <p className="text-[9px] font-mono uppercase text-[var(--fios-text-muted)]">Skill</p>
          <p className="text-sm font-black text-[var(--fios-text)]">{sp}</p>
        </div>
        <div className="rounded-lg bg-[var(--fios-surface-2)] border fios-border p-2">
          <p className="text-[9px] font-mono uppercase text-[var(--fios-text-muted)]">Streak</p>
          <p className="text-sm font-black text-[var(--fios-text)]">{streak?.current_streak ?? 0}</p>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-[10px] font-mono font-bold uppercase text-[var(--fios-text-muted)]">
          Immersive themes (study milestones)
        </p>
        {THEME_UNLOCKS.map((t) => {
          const immersive = IMMERSIVE_THEMES.find((x) => x.id === t.immersiveId);
          const unlocked =
            rewardsIncludeTheme(rewards, t.key) ||
            rewards.includes(t.reward) ||
            (immersive ? isThemeUnlockedByMetrics(immersive, metrics) : false);
          return (
            <button
              key={t.key}
              type="button"
              disabled={busy}
              onClick={() => void applyOrReveal(t)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border fios-border bg-[var(--fios-surface-2)] text-xs font-bold cursor-pointer text-[var(--fios-text)] text-left"
            >
              <span className="flex items-center gap-2 min-w-0">
                {unlocked ? (
                  <Unlock className="w-3.5 h-3.5 accent-solid-text shrink-0" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-[var(--fios-text-muted)] shrink-0" />
                )}
                <span className="min-w-0">
                  <span className="block truncate">{t.label}</span>
                  {!unlocked && (
                    <span className="block text-[9px] font-mono font-normal text-[var(--fios-text-muted)] truncate">
                      {t.unlockHint}
                    </span>
                  )}
                </span>
              </span>
              <span className="text-[10px] font-mono text-[var(--fios-text-muted)] shrink-0">
                {unlocked ? (accent === t.key ? 'Active' : 'Apply') : 'Locked'}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void activateFocusBuff()}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border fios-border text-xs font-bold cursor-pointer text-[var(--fios-text)]"
      >
        <Snowflake className="w-3.5 h-3.5 accent-solid-text" />
        Focus Buff — weekend streak freeze (3 SP)
      </button>
      {streak?.streak_freeze_until && (
        <p className="text-[10px] font-mono text-[var(--fios-text-muted)]">
          Freeze until {streak.streak_freeze_until}
        </p>
      )}
    </div>
  );
};

export default RpgProgressPanel;
