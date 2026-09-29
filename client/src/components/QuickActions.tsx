import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Zap, FileText, Timer, Bot, X, Layers, Check, Loader2, Folder,
  CheckSquare, Calendar, HelpCircle, BookOpen, Target, GraduationCap, Flame, Focus,
} from 'lucide-react';
import { usePomodoroControls, usePomodoroState, formatClock } from '../context/PomodoroContext';
import {
  usePreferences,
  type SmartActionId,
  type SmartMetricId,
  DEFAULT_SMART_ACTIONS,
  SMART_ACTION_LABELS,
} from '../context/PreferencesContext';
import { supabase } from '../lib/supabase';
import { IS_DEMO } from '../lib/demo';
import { getUserModules, type DBModule, moduleDisplayName } from '../lib/moduleService';
import { getUserDecksWithCards } from '../lib/deckService';
import { getTasks, peekCachedTasks } from '../lib/taskService';
import { getFocusSessions } from '../lib/focusService';
import { getCachedCalendarEvents } from '../lib/calendarService';
import { peekUnifiedScheduleEvents, peekSavedCalendarUrl } from '../lib/scheduleService';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { sanitizeDeckTitle } from '../lib/sanitizeDeckTitle';

interface QuickActionsProps {
  onNavigate: (tab: string, options?: { openTutor?: boolean }) => void;
  onOpenTutor?: () => void;
}

const ACTION_ICONS: Record<SmartActionId, typeof Zap> = {
  flashcard: Zap,
  note: FileText,
  pomodoro: Timer,
  tutor: Bot,
  tasks: CheckSquare,
  schedule: Calendar,
  quiz: HelpCircle,
  modules: BookOpen,
  grades: Target,
  flashcards: Layers,
  timer: Timer,
  calendar: GraduationCap,
  zen: Focus,
};

const QuickAddFlashcardModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [title, setTitle] = useState('Quick Deck');
  const [moduleCode, setModuleCode] = useState('');
  const [modules, setModules] = useState<DBModule[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => { getUserModules().then(setModules).catch(() => setModules([])); }, []);

  const save = async () => {
    if (!front.trim() || !back.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (!IS_DEMO) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Authentication required.');
        const { data: deck, error: deckErr } = await supabase
          .from('decks')
          .insert({ user_id: user.id, title: sanitizeDeckTitle(title.trim() || 'Quick Deck'), module_code: moduleCode || null })
          .select().single();
        if (deckErr || !deck) throw new Error(deckErr?.message || 'Failed to create deck.');
        const { error: cardErr } = await supabase.from('cards').insert({ deck_id: deck.id, question: front.trim(), answer: back.trim() });
        if (cardErr) throw new Error(cardErr.message);
      }
      setDone(true);
      setTimeout(onClose, 900);
    } catch (err: any) {
      setError(err.message || 'Failed to save card.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
        className="relative z-50 w-full max-w-md rounded-2xl border fios-border-strong bg-[var(--fios-surface)] p-6 space-y-4 shadow-2xl fios-card">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-[var(--fios-text)] flex items-center gap-2"><Layers className="w-4 h-4 accent-solid-text" /> Quick Add Flashcard</h3>
          <button type="button" onClick={onClose} className="text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] cursor-pointer" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        {done ? (
          <div className="py-6 text-center accent-solid-text font-bold flex flex-col items-center gap-2"><Check className="w-8 h-8" /> Saved!</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Deck title"
                className="bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2 text-sm text-[var(--fios-text)] focus:outline-none focus:accent-border" />
              <div className="flex items-center gap-1.5 bg-[var(--fios-surface-2)] border fios-border rounded-lg px-2.5 py-2">
                <Folder className="w-3.5 h-3.5 accent-solid-text shrink-0" />
                <select value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} className="bg-transparent text-sm text-[var(--fios-text)] focus:outline-none cursor-pointer w-full">
                  <option value="">General</option>
                  {modules.map((m) => <option key={m.id} value={m.code}>{moduleDisplayName(m)}</option>)}
                </select>
              </div>
            </div>
            <textarea value={front} onChange={(e) => setFront(e.target.value)} placeholder="Front (question / term)…"
              className="w-full h-20 bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2 text-sm text-[var(--fios-text)] focus:outline-none focus:accent-border" />
            <textarea value={back} onChange={(e) => setBack(e.target.value)} placeholder="Back (answer / definition)…"
              className="w-full h-20 bg-[var(--fios-surface-2)] border fios-border rounded-lg px-3 py-2 text-sm text-[var(--fios-text)] focus:outline-none focus:accent-border" />
            {error && <p className="text-xs text-rose-400 font-bold">{error}</p>}
            <button type="button" onClick={save} disabled={saving || !front.trim() || !back.trim()}
              className="w-full py-2.5 accent-bg text-slate-950 font-black uppercase text-xs rounded-lg cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Card
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};

function computeStreak(dates: string[]): number {
  const days = new Set(dates.map((d) => d.slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (!days.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onNavigate, onOpenTutor }) => {
  const { start } = usePomodoroControls();
  const { timeLeft, isActive } = usePomodoroState();
  const {
    showSmartWidget,
    smartWidgetActions,
    smartWidgetMetrics,
    smartWidgetCompact,
    smartWidgetShowMetrics,
    zenMode,
    setZenMode,
  } = usePreferences();
  const [open, setOpen] = useState(false);
  const [showFlashcard, setShowFlashcard] = useState(false);
  const [metrics, setMetrics] = useState<Partial<Record<SmartMetricId, string | number>>>({});
  useBodyScrollLock(open);

  useEffect(() => {
    if (!showSmartWidget || !smartWidgetShowMetrics) return;
    let cancelled = false;
    (async () => {
      try {
        const need = new Set(smartWidgetMetrics?.length ? smartWidgetMetrics : ['dueCards', 'tasks']);
        const wantTasks = need.has('tasks');
        const [decks, tasks, sessions] = await Promise.all([
          need.has('dueCards') ? getUserDecksWithCards().catch(() => []) : Promise.resolve([]),
          wantTasks ? getTasks().catch(() => peekCachedTasks() || []) : Promise.resolve(peekCachedTasks() || []),
          need.has('streak') ? getFocusSessions().catch(() => []) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        const next: Partial<Record<SmartMetricId, string | number>> = {};
        if (need.has('dueCards')) {
          const nowIso = new Date().toISOString();
          let due = 0;
          for (const deck of decks || []) {
            for (const c of (deck as any).cards || []) {
              if (!c.next_review || c.next_review <= nowIso) due++;
            }
          }
          next.dueCards = due;
        }
        if (need.has('tasks')) {
          next.tasks = (tasks || []).filter((t: any) => !t.completed).length;
        }
        if (need.has('streak')) {
          next.streak = computeStreak((sessions || []).map((s: any) => s.created_at || ''));
        }
        if (need.has('timer')) {
          next.timer = isActive ? formatClock(timeLeft) : 'idle';
        }
        if (need.has('upcoming')) {
          try {
            const now = new Date();
            const rangeEnd = new Date(now);
            rangeEnd.setDate(rangeEnd.getDate() + 14);
            const peeked = peekUnifiedScheduleEvents(now, rangeEnd);
            const cached = peeked.events.length ? peeked.events : getCachedCalendarEvents();
            if (cached.length || peekSavedCalendarUrl()) {
              next.upcoming = cached.filter((e) => e.startDate.getTime() >= now.getTime()).length;
            } else {
              next.upcoming = 0;
            }
          } catch {
            next.upcoming = 0;
          }
        }
        setMetrics(next);
      } catch {
        /* ignore metrics failures */
      }
    })();
    return () => { cancelled = true; };
  }, [showSmartWidget, smartWidgetShowMetrics, smartWidgetMetrics, isActive, timeLeft]);

  const handleAskAI = () => {
    setOpen(false);
    if (onOpenTutor) onOpenTutor();
    else onNavigate('tutor');
  };

  const actionHandlers: Record<SmartActionId, () => void> = {
    flashcard: () => { setShowFlashcard(true); setOpen(false); },
    note: () => { onNavigate('documents'); setOpen(false); },
    pomodoro: () => { start(); onNavigate('timer'); setOpen(false); },
    tutor: handleAskAI,
    tasks: () => { onNavigate('overview'); setOpen(false); },
    schedule: () => { onNavigate('schedule'); setOpen(false); },
    quiz: () => { onNavigate('quiz'); setOpen(false); },
    modules: () => { onNavigate('modules'); setOpen(false); },
    grades: () => { onNavigate('grades'); setOpen(false); },
    flashcards: () => { onNavigate('flashcards'); setOpen(false); },
    timer: () => { onNavigate('timer'); setOpen(false); },
    calendar: () => { onNavigate('atu-calendar'); setOpen(false); },
    zen: () => { setZenMode(!zenMode); setOpen(false); },
  };

  const actions = useMemo(() => {
    const ids = (Array.isArray(smartWidgetActions) ? smartWidgetActions : DEFAULT_SMART_ACTIONS) as SmartActionId[];
    return ids
      .filter((id) => ACTION_ICONS[id])
      .map((id) => ({
        id,
        label: id === 'zen'
          ? (zenMode ? 'Exit Zen / Deep Focus' : 'Enter Zen / Deep Focus')
          : SMART_ACTION_LABELS[id],
        icon: ACTION_ICONS[id],
        onClick: actionHandlers[id],
      }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smartWidgetActions, onNavigate, onOpenTutor, zenMode, setZenMode]);

  const metricChips = useMemo(() => {
    const order = (smartWidgetMetrics?.length ? smartWidgetMetrics : ['dueCards', 'tasks']) as SmartMetricId[];
    return order.map((id) => {
      const value = metrics[id];
      if (id === 'dueCards') return { id, label: `${value ?? '…'} due` };
      if (id === 'tasks') return { id, label: `${value ?? '…'} tasks` };
      if (id === 'streak') return { id, label: `${value ?? 0}d streak` };
      if (id === 'timer') return { id, label: String(value ?? 'idle') };
      if (id === 'upcoming') return { id, label: `${value ?? 0} up next` };
      return { id, label: String(value ?? '') };
    });
  }, [smartWidgetMetrics, metrics]);

  if (!showSmartWidget) return null;

  const compactPrimary = metricChips[0]?.label;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* Dock child — parent FloatingDock owns fixed placement; raise above backdrop when open */}
      <div className={`relative flex flex-col items-end gap-2 font-sans pointer-events-auto ${open ? 'z-40' : 'z-30'}`}>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="flex flex-col gap-2 items-end max-h-[55vh] overflow-y-auto pr-0.5"
            >
              {smartWidgetShowMetrics && !smartWidgetCompact && metricChips.length > 0 && (
                <div className="flex flex-wrap justify-end gap-1.5 px-3 py-2 rounded-xl border fios-border-strong bg-[var(--fios-surface)] text-[10px] font-mono font-bold text-[var(--fios-text-muted)] shadow-xl max-w-[240px]">
                  {metricChips.map((m, i) => (
                    <span key={m.id} className={`inline-flex items-center gap-1 ${i === 0 ? 'accent-solid-text' : ''}`}>
                      {i > 0 && <span className="text-[var(--fios-text-muted)] mr-0.5">·</span>}
                      {m.id === 'streak' && <Flame className="w-3 h-3" />}
                      {m.label}
                    </span>
                  ))}
                </div>
              )}
              {actions.length === 0 ? (
                <div className="px-3 py-2.5 rounded-xl border fios-border bg-[var(--fios-surface)] text-[10px] font-mono text-[var(--fios-text-muted)] shadow-xl max-w-[220px] text-right">
                  No actions enabled. Turn some on in Settings → Smart Quick Widget.
                </div>
              ) : (
                actions.map((a) => {
                  const Icon = a.icon;
                  return (
                    <motion.button
                      key={a.id}
                      type="button"
                      whileHover={{ x: -3 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={a.onClick}
                      className="touch-target-row flex items-center gap-2.5 pl-4 pr-3.5 py-3 rounded-xl border fios-border-strong bg-[var(--fios-surface)] shadow-2xl text-[var(--fios-text)] text-xs font-bold cursor-pointer hover:bg-[var(--fios-surface-2)] active:bg-[var(--fios-surface-2)] transition-colors"
                    >
                      {a.label}
                      <span className="w-6 h-6 rounded-lg accent-bg flex items-center justify-center text-slate-950"><Icon className="w-3.5 h-3.5" /></span>
                    </motion.button>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => setOpen((v) => !v)}
          className={`rounded-2xl accent-bg text-slate-950 shadow-2xl accent-glow cursor-pointer flex items-center justify-center gap-2 active:opacity-90 ${
            smartWidgetCompact ? 'w-12 h-12 min-w-12' : 'w-14 h-14 min-w-14'
          } ${smartWidgetShowMetrics && smartWidgetCompact && compactPrimary ? 'px-3.5 w-auto min-w-12' : ''}`}
          aria-label="Quick actions"
          aria-expanded={open}
        >
          {smartWidgetShowMetrics && smartWidgetCompact && compactPrimary && (
            <span className="text-[10px] font-black font-mono pl-1 max-w-[4.5rem] truncate">{compactPrimary}</span>
          )}
          <motion.span animate={{ rotate: open ? 45 : 0 }} className="block"><Plus className="w-6 h-6" /></motion.span>
        </motion.button>
      </div>

      <AnimatePresence>{showFlashcard && <QuickAddFlashcardModal onClose={() => setShowFlashcard(false)} />}</AnimatePresence>
    </>
  );
};

export default QuickActions;
