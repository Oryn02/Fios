import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Pencil, Check, X, Flame } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useProfile } from '../context/ProfileContext';
import { usePomodoroState } from '../context/PomodoroContext';
import { getWeeklyFocusMinutes } from '../lib/focusService';

type WeeklyGoalVariant = 'strip' | 'card';

interface WeeklyGoalWidgetProps {
  /** `strip` = Overview hero-adjacent progress bar; `card` = compact surface card. */
  variant?: WeeklyGoalVariant;
  /** @deprecated Prefer `variant="card"`. Kept for callers that pass compact. */
  compact?: boolean;
}

export const WeeklyGoalWidget: React.FC<WeeklyGoalWidgetProps> = ({
  variant,
  compact = false,
}) => {
  const resolved: WeeklyGoalVariant = variant ?? (compact ? 'card' : 'strip');
  const { profile, updateProfile } = useProfile();
  const { completedSessions } = usePomodoroState();
  const [minutes, setMinutes] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(10);
  const [saving, setSaving] = useState(false);
  useBodyScrollLock(editing);

  const goalHours = profile?.weekly_study_goal_hours ?? 10;

  const refresh = () => {
    getWeeklyFocusMinutes().then(setMinutes).catch(() => setMinutes(0));
  };

  useEffect(() => {
    refresh();
  }, [completedSessions]);

  const doneHours = Math.round((minutes / 60) * 10) / 10;
  const remaining = Math.max(0, Math.round((goalHours - doneHours) * 10) / 10);
  const pct = Math.min(100, goalHours > 0 ? Math.round((doneHours / goalHours) * 100) : 0);
  const smashed = pct >= 100;

  const openEdit = () => {
    setDraft(goalHours);
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ weekly_study_goal_hours: draft });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const editModal = (
    <AnimatePresence>
      {editing && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setEditing(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-50 w-full max-w-sm rounded-2xl border fios-border bg-[var(--fios-surface)] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[var(--fios-text)] flex items-center gap-2">
                <Target className="w-4 h-4 accent-solid-text" /> Weekly Goal
              </h3>
              <button
                type="button"
                onClick={() => setEditing(false)}
              className="touch-target shrink-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-mono font-bold uppercase text-[var(--fios-text-muted)]">
                Target focus hours per week
              </span>
              <input
                type="number"
                min={1}
                max={80}
                value={draft}
                onChange={(e) => setDraft(Math.max(1, Math.min(80, Number(e.target.value))))}
                className="w-full bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2 text-sm text-[var(--fios-text)] focus:outline-none focus:accent-border"
              />
            </label>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="w-full py-2.5 accent-bg text-slate-950 font-black uppercase text-xs rounded-lg cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Goal'}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (resolved === 'strip') {
    return (
      <>
        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.05 }}
          aria-label="Weekly study goal"
          className="relative overflow-hidden rounded-2xl border fios-border bg-[var(--fios-surface)]/80 px-4 py-3.5 sm:px-5 sm:py-4"
        >
          <div className="absolute inset-y-0 left-0 w-[3px] accent-bg opacity-90" aria-hidden />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex items-center justify-between gap-3 sm:min-w-[11rem] sm:flex-col sm:items-start sm:justify-center sm:gap-1 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Target className="w-4 h-4 accent-solid-text shrink-0" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[10px] font-black font-mono uppercase tracking-widest text-[var(--fios-text-muted)]">
                    Weekly Study Goal
                  </p>
                  <p className="text-lg sm:text-xl font-black italic tracking-tight text-[var(--fios-text)] leading-tight">
                    {doneHours}
                    <span className="text-[var(--fios-text-muted)] text-sm font-mono not-italic font-bold">
                      {' '}
                      / {goalHours}h
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={openEdit}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border fios-border bg-[var(--fios-surface-2)] px-2.5 py-1.5 text-[10px] font-black font-mono uppercase tracking-wider accent-solid-text hover:opacity-90 cursor-pointer"
                aria-label={`Edit weekly goal, currently ${goalHours} hours`}
              >
                <Pencil className="w-3 h-3" /> {goalHours}h target
              </button>
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] sm:text-xs font-medium text-[var(--fios-text-muted)] flex items-center gap-1.5 min-w-0">
                  <Flame className="w-3.5 h-3.5 accent-solid-text shrink-0" aria-hidden />
                  <span className="truncate">
                    {smashed
                      ? 'Goal smashed this week — keep the streak going.'
                      : `${remaining}h to go · from Pomodoro focus sessions`}
                  </span>
                </p>
                <span className="text-sm font-black font-mono accent-solid-text shrink-0 tabular-nums">
                  {pct}%
                </span>
              </div>
              <div
                className="w-full h-2.5 bg-[var(--fios-surface-2)] rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${pct} percent of weekly study goal`}
              >
                <motion.div
                  className="h-full accent-bg rounded-full"
                  initial={false}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  style={{ willChange: 'width' }}
                />
              </div>
            </div>
          </div>
        </motion.section>
        {editModal}
      </>
    );
  }

  return (
    <div className="rounded-xl border fios-border bg-[var(--fios-surface)] p-3.5 space-y-2 min-h-[100px] h-auto flex flex-col justify-between shrink-0 shadow-xl">
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[var(--fios-text-muted)]">
        <span className="flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 accent-solid-text shrink-0" /> Weekly Study Goal
        </span>
        <button
          type="button"
          onClick={openEdit}
          className="accent-solid-text hover:opacity-80 flex items-center gap-1 cursor-pointer"
        >
          <Pencil className="w-3 h-3" /> {goalHours}h
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-black text-[var(--fios-text)]">
          {doneHours}h <span className="text-[var(--fios-text-muted)] text-xs font-mono">/ {goalHours}h</span>
        </span>
        <span className="text-xs font-black accent-solid-text">{pct}%</span>
      </div>

      <div className="w-full h-1.5 bg-[var(--fios-surface-2)] rounded-full overflow-hidden">
        <motion.div
          className="h-full accent-bg"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
          style={{ willChange: 'width' }}
        />
      </div>

      <p className="text-[11px] font-medium text-[var(--fios-text-muted)] pt-0.5 flex items-center gap-1">
        <Flame className="w-3 h-3 accent-solid-text shrink-0" />{' '}
        {smashed ? 'Goal smashed this week!' : `${remaining}h to go this week.`}
      </p>

      {editModal}
    </div>
  );
};

export default WeeklyGoalWidget;
