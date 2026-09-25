import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Pencil, Check, X, Flame } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { usePomodoroState } from '../context/PomodoroContext';
import { getWeeklyFocusMinutes } from '../lib/focusService';

export const WeeklyGoalWidget: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { profile, updateProfile } = useProfile();
  const { completedSessions } = usePomodoroState();
  const [minutes, setMinutes] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(10);
  const [saving, setSaving] = useState(false);

  const goalHours = profile?.weekly_study_goal_hours ?? 10;

  const refresh = () => { getWeeklyFocusMinutes().then(setMinutes).catch(() => setMinutes(0)); };

  // Reload when a focus session completes (completedSessions increments).
  useEffect(() => { refresh(); }, [completedSessions]);

  const doneHours = Math.round((minutes / 60) * 10) / 10;
  const pct = Math.min(100, goalHours > 0 ? Math.round((doneHours / goalHours) * 100) : 0);

  const openEdit = () => { setDraft(goalHours); setEditing(true); };
  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ weekly_study_goal_hours: draft });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`rounded-xl border fios-border bg-[var(--fios-surface)] p-4 space-y-2 ${compact ? '' : 'shadow-xl'}`}>
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[var(--fios-text-muted)]">
        <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5 accent-solid-text" /> Weekly Study Goal</span>
        <button onClick={openEdit} className="accent-solid-text hover:opacity-80 flex items-center gap-1 cursor-pointer">
          <Pencil className="w-3 h-3" /> {goalHours}h
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-black text-[var(--fios-text)]">{doneHours}h <span className="text-[var(--fios-text-muted)] text-xs font-mono">/ {goalHours}h</span></span>
        <span className="text-xs font-black accent-solid-text">{pct}%</span>
      </div>

      <div className="w-full h-1.5 bg-[var(--fios-surface-2)] rounded-full overflow-hidden">
        <motion.div className="h-full accent-bg" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} style={{ willChange: 'width' }} />
      </div>

      <p className="text-[11px] font-medium text-[var(--fios-text-muted)] pt-0.5 flex items-center gap-1">
        <Flame className="w-3 h-3 accent-solid-text" /> {pct >= 100 ? 'Goal smashed this week!' : `${Math.max(0, Math.round((goalHours - doneHours) * 10) / 10)}h to go this week.`}
      </p>

      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="absolute inset-0" onClick={() => setEditing(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-sm rounded-2xl border fios-border bg-[var(--fios-surface)] p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-[var(--fios-text)] flex items-center gap-2"><Target className="w-4 h-4 accent-solid-text" /> Weekly Goal</h3>
                <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-mono font-bold uppercase text-[var(--fios-text-muted)]">Target focus hours per week</span>
                <input type="number" min={1} max={80} value={draft} onChange={(e) => setDraft(Math.max(1, Math.min(80, Number(e.target.value))))}
                  className="w-full bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2 text-sm text-[var(--fios-text)] focus:outline-none focus:accent-border" />
              </label>
              <button onClick={save} disabled={saving} className="w-full py-2.5 accent-bg text-slate-950 font-black uppercase text-xs rounded-lg cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
                <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Goal'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WeeklyGoalWidget;
