import React, { useEffect, useState } from 'react';
import { Flame, Sparkles } from 'lucide-react';
import { xpProgress, nextRewardTease } from '../../lib/rpg';
import type { RpgStatus } from '../../services/rpgApi';
import { collectStudyMetrics } from '../../lib/studyMilestones';
import type { StudyMetrics } from '../../lib/rpgThemeRegistry';

interface PlayerCardProps {
  status: RpgStatus | null;
  name?: string;
  compact?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ status, name, compact }) => {
  const xp = status?.xp ?? 0;
  const sp = status?.skill_points ?? 0;
  const streak = status?.streak?.current_streak ?? 0;
  const rewards = status?.unlocked_rewards ?? [];
  const prog = xpProgress(xp);
  const [metrics, setMetrics] = useState<StudyMetrics>({});

  useEffect(() => {
    void collectStudyMetrics({ xp, streakDays: streak }).then(setMetrics);
  }, [xp, streak]);

  const tease = nextRewardTease(xp, sp, rewards, metrics);

  return (
    <div
      className={`bg-[var(--fios-surface)] border fios-border rounded-2xl shadow-sm dark:shadow-none ${
        compact ? 'p-3' : 'p-4 sm:p-5'
      } space-y-3`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-mono font-black uppercase tracking-widest accent-solid-text flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Player card
          </p>
          <h3 className="text-base sm:text-lg font-black italic uppercase tracking-tight text-[var(--fios-text)] truncate">
            {name || 'Student'} · Lv {prog.level}
          </h3>
        </div>
        <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--fios-surface-2)] border fios-border text-xs font-black">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-[var(--fios-text)]">{streak}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[var(--fios-text-muted)]">
          <span>
            {prog.intoLevel} / {prog.needForNext} XP
          </span>
          <span>
            {xp} total · {sp} SP
          </span>
        </div>
        <div className="h-2 rounded-full bg-[var(--fios-surface-2)] border fios-border overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--fios-accent-from)] via-[var(--fios-accent-via)] to-[var(--fios-accent-to)] transition-all duration-500"
            style={{ width: `${prog.pct}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-[var(--fios-text-muted)]">
        {tease.hint ? (
          <>
            Next theme: <span className="font-bold accent-solid-text">{tease.label}</span>
            <span className="block text-[10px] font-mono mt-0.5 opacity-80">{tease.hint}</span>
          </>
        ) : tease.remainingXp > 0 ? (
          <>
            <span className="font-bold accent-solid-text">{tease.remainingXp} XP</span> until {tease.label}
          </>
        ) : (
          <>
            Ready to unlock <span className="font-bold accent-solid-text">{tease.label}</span>
          </>
        )}
      </p>
    </div>
  );
};

export default PlayerCard;
