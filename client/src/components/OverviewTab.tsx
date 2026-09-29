import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, Plus, ArrowRight, Calendar, CheckCircle2,
  Clock, Layers, FolderKanban, Trash2, MapPin, Sparkles, Check,
  GripVertical, Eye, EyeOff,
} from 'lucide-react';
import { IS_DEMO } from '../lib/demo';
import { CalendarEvent } from '../lib/calendarService';
import { loadUnifiedScheduleEvents, peekUnifiedScheduleEvents } from '../lib/scheduleService';
import { isCardDue } from '../lib/spacedRepetition';
import { getTasks, createTask, toggleTask, deleteTask, peekCachedTasks } from '../lib/taskService';
import { getUserDecksWithCards } from '../lib/deckService';
import { getUserModules, peekCachedModules, type DBModule } from '../lib/moduleService';
import { toDatetimeLocalValue, fromDatetimeLocalValue } from '../lib/agendaService';
import type { Task } from '../types/db';
import { usePreferredName, useProfile } from '../context/ProfileContext';
import { usePreferences, type WidgetId, DEFAULT_WIDGET_ORDER } from '../context/PreferencesContext';
import { Avatar } from './Avatar';
import { ModuleHeatmap } from './ModuleHeatmap';
import { RevisionFlightPlan } from './RevisionFlightPlan';
import { CompactAgenda } from './CompactAgenda';
import { DatetimeLocalInput } from './DatetimeLocalInput';
import { StudyStreakHeatmap } from './StudyStreakHeatmap';
import { ExamCountdownWidget } from './ExamCountdownWidget';
import { WeeklyGoalWidget } from './WeeklyGoalWidget';
import { toast } from '../lib/toast';
import { overviewGreeting } from '../lib/holidays';
import { useTheme } from '../context/ThemeContext';
import { HolidayMotif } from './HolidayMotif';
import { ReportContentButton } from './ReportContentButton';

import type { FlightNavigatePayload } from './RevisionFlightPlan';

interface OverviewTabProps {
  onOpenFlashcards: (deckCards?: any[], title?: string, moduleCode?: string, isSaved?: boolean) => void;
  onNavigate?: (tab: string, payload?: FlightNavigatePayload) => void;
  /** Open SM-2 review for all due cards across decks (Review Queue). */
  onOpenReviewQueue?: () => void;
  /** When false (keep-alive hidden), skip timers/refetch; when true again, soft-refresh. */
  isActive?: boolean;
}

interface SavedDeck {
  id: string;
  title: string;
  module_code?: string;
  created_at: string;
  cards?: { id: string; question?: string; answer?: string; front?: string; back?: string }[];
}

function greetingFor(date: Date, birthday?: string | null): string {
  return overviewGreeting(date, birthday);
}

const WIDGET_LABELS: Record<WidgetId, string> = {
  flightPlan: 'Flight Plan',
  heatmap: 'Heatmap',
  dueCards: 'Due Cards',
  calendar: 'iCal Agenda',
};

const OverviewTabInner: React.FC<OverviewTabProps> = ({ onOpenFlashcards, onNavigate, onOpenReviewQueue, isActive = true }) => {
  const rawPreferredName = usePreferredName();
  const { profile } = useProfile();
  const { widgetOrder, widgetVisibility, setWidgetOrder, setWidgetVisible } = usePreferences();
  const { holidayTheme } = useTheme();
  
  // Guard demo mode to fallback to "Student" instead of personal name strings
  const preferredName = IS_DEMO 
    ? 'Student' 
    : rawPreferredName || profile?.preferred_name || profile?.full_name || 'Student';

  const cachedTasks = peekCachedTasks();
  const cachedModules = peekCachedModules();
  const schedulePeek = (() => {
    const now = new Date();
    const rangeEnd = new Date(now);
    rangeEnd.setDate(rangeEnd.getDate() + 21);
    return peekUnifiedScheduleEvents(now, rangeEnd);
  })();

  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [dueCardCount, setDueCardCount] = useState(0);

  const [todayClasses, setTodayClasses] = useState<CalendarEvent[]>(() => {
    const now = new Date();
    return schedulePeek.events
      .filter(
        (e) =>
          e.startDate.getFullYear() === now.getFullYear() &&
          e.startDate.getMonth() === now.getMonth() &&
          e.startDate.getDate() === now.getDate()
      )
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  });
  const [upcomingClasses, setUpcomingClasses] = useState<CalendarEvent[]>(() => {
    const now = new Date();
    return schedulePeek.events
      .filter((e) => e.startDate.getTime() >= now.getTime())
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, 5);
  });
  const [loadingClasses, setLoadingClasses] = useState(() => schedulePeek.events.length === 0);

  const [tasks, setTasks] = useState<Task[]>(() => cachedTasks || []);
  const [loadingTasks, setLoadingTasks] = useState(() => !cachedTasks);
  const [modules, setModules] = useState<DBModule[]>(() => cachedModules || []);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskStart, setNewTaskStart] = useState('');
  const [newTaskDueAt, setNewTaskDueAt] = useState('');

  const greeting = useMemo(
    () => greetingFor(new Date(), profile?.birthday),
    [profile?.birthday]
  );
  const todayLabel = useMemo(
    () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase(),
    []
  );

  useEffect(() => {
    let cancelled = false;
    // Soft refresh: keep cached tasks/classes visible while network updates.
    if (!cachedTasks) setLoadingTasks(true);
    getTasks()
      .then((data) => {
        if (!cancelled) setTasks(data);
      })
      .catch((err) => console.error('Failed to load tasks:', err))
      .finally(() => {
        if (!cancelled) setLoadingTasks(false);
      });
    getUserModules()
      .then((m) => {
        if (!cancelled) setModules(m);
      })
      .catch(() => {});

    const fetchDecks = async () => {
      setLoadingDecks(true);
      try {
        const data = await getUserDecksWithCards();
        if (cancelled) return;
        setSavedDecks((data || []).slice(0, 3) as SavedDeck[]);
        let due = 0;
        for (const deck of data || []) {
          for (const c of (deck as any).cards || []) {
            if (isCardDue(c.next_review)) due++;
          }
        }
        setDueCardCount(due);
      } catch (err) {
        console.error('Failed to load decks:', err);
      } finally {
        if (!cancelled) setLoadingDecks(false);
      }
    };

    const fetchSchedule = async () => {
      if (schedulePeek.events.length === 0) setLoadingClasses(true);
      try {
        const now = new Date();
        const rangeEnd = new Date(now);
        rangeEnd.setDate(rangeEnd.getDate() + 21);
        const { events } = await loadUnifiedScheduleEvents(now, rangeEnd, { skipReconcile: schedulePeek.fromCache });
        if (cancelled) return;
        const todayEvents = events.filter((e) =>
          e.startDate.getFullYear() === now.getFullYear() &&
          e.startDate.getMonth() === now.getMonth() &&
          e.startDate.getDate() === now.getDate()
        ).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
        setTodayClasses(todayEvents);
        const upcoming = events
          .filter((e) => e.startDate.getTime() >= now.getTime())
          .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
          .slice(0, 5);
        setUpcomingClasses(upcoming);
      } catch (err) {
        console.error('Failed to load today classes:', err);
      } finally {
        if (!cancelled) setLoadingClasses(false);
      }
    };

    fetchDecks();
    fetchSchedule();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once SWR
  }, []);

  // Soft refresh tasks/modules when returning to Overview (keep-alive).
  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;
    getTasks()
      .then((data) => { if (!cancelled) setTasks(data); })
      .catch(() => {});
    getUserModules()
      .then((m) => { if (!cancelled) setModules(m); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isActive]);

  const handleAddTask = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const due = fromDatetimeLocalValue(newTaskDueAt);
    if (!due) {
      toast('Pick a due date and time', 'error');
      return;
    }
    const start = fromDatetimeLocalValue(newTaskStart) || new Date(due.getTime() - 30 * 60 * 1000);
    try {
      const created = await createTask({
        title: newTaskTitle,
        dueAt: due.toISOString(),
        startAt: start.toISOString(),
      });
      setTasks((prev) => [created, ...prev]);
      setNewTaskTitle('');
      setNewTaskStart('');
      setNewTaskDueAt('');
      setIsAddingTask(false);
      toast('Task saved', 'success');
    } catch (err) {
      console.error('Failed to add task:', err);
      toast('Failed to save task', 'error');
    }
  }, [newTaskTitle, newTaskStart, newTaskDueAt]);

  const moduleColorList = useMemo(
    () => modules.map((m) => ({ code: m.code, color: m.color, name: m.name })),
    [modules]
  );

  const todayAnchor = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const handleToggleTask = useCallback(async (id: string, completed: boolean) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t)));
    try {
      await toggleTask(id, !completed);
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  }, []);

  const handleDeleteTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteTask(id);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }, []);

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const pendingTaskCount = tasks.filter((t) => !t.completed).length;

  const orderedWidgets = useMemo(() => {
    const order = widgetOrder?.length ? widgetOrder : DEFAULT_WIDGET_ORDER;
    return order.filter((id) => widgetVisibility[id] !== false);
  }, [widgetOrder, widgetVisibility]);

  const moveWidget = (id: WidgetId, dir: -1 | 1) => {
    const order = [...(widgetOrder?.length ? widgetOrder : DEFAULT_WIDGET_ORDER)];
    const i = order.indexOf(id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    setWidgetOrder(order);
  };

  const openReviewQueue = useCallback(() => {
    if (onOpenReviewQueue) {
      onOpenReviewQueue();
      return;
    }
    // Fallback: gather due cards from loaded decks
    const due: any[] = [];
    for (const deck of savedDecks) {
      for (const c of deck.cards || []) {
        if (isCardDue((c as any).next_review)) due.push(c);
      }
    }
    if (due.length) onOpenFlashcards(due, 'Review Queue', undefined, true);
    else onOpenFlashcards();
  }, [onOpenReviewQueue, onOpenFlashcards, savedDecks]);

  const renderWidget = (id: WidgetId) => {
    if (id === 'flightPlan') {
      return (
        <RevisionFlightPlan
          key={id}
          onNavigate={(tab, payload) => {
            if (payload?.intent === 'review' && payload.deckCards?.length) {
              onOpenFlashcards(payload.deckCards, payload.deckTitle, payload.moduleCode || undefined, true);
              return;
            }
            onNavigate?.(tab, payload);
          }}
        />
      );
    }
    if (id === 'heatmap') {
      return <ModuleHeatmap key={id} />;
    }
    if (id === 'dueCards') {
      return (
        <div key={id} className="bg-card/60 border border-border/80 rounded-2xl p-6 space-y-3 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black font-mono uppercase tracking-widest accent-solid-text mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Due SM-2 Cards
              </div>
              <h3 className="text-lg font-black italic uppercase tracking-wide text-foreground">Review queue</h3>
            </div>
            <span className="text-2xl font-black accent-solid-text font-mono">{dueCardCount}</span>
          </div>
          <p className="text-xs text-muted-foreground">Cards due today across all decks according to your SM-2 schedule.</p>
          <button
            type="button"
            onClick={openReviewQueue}
            className="text-xs font-mono accent-solid-text hover:underline cursor-pointer"
          >
            Start SM-2 review →
          </button>
        </div>
      );
    }
    if (id === 'calendar') {
      return (
        <div key={id} className="bg-card/60 border border-border/80 rounded-2xl p-6 space-y-3 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div>
              <div className="text-[10px] font-black font-mono uppercase tracking-widest accent-solid-text mb-0.5">Unified timeline</div>
              <h3 className="text-lg font-black italic uppercase tracking-wide text-foreground">Compact agenda</h3>
            </div>
            <button type="button" onClick={() => onNavigate?.('atu-calendar')} className="text-xs font-mono accent-solid-text hover:underline cursor-pointer">
              Full calendar →
            </button>
          </div>
          <CompactAgenda
            classes={upcomingClasses.length ? upcomingClasses : todayClasses}
            tasks={tasks}
            modules={moduleColorList}
            loading={loadingClasses || loadingTasks}
            limit={10}
            compact
            emptyMessage="No upcoming classes or timed tasks. Sync iCal or add a task with a due time."
            onToggleTask={handleToggleTask}
          />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans text-foreground">
      {/* 1. Greeting Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/80 pb-6"
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Avatar url={profile?.avatar_url} name={preferredName} size={56} className="shrink-0 accent-ring" />
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-widest accent-solid-text mb-1 flex items-center gap-2 font-mono">
              <HolidayMotif themeFamily={holidayTheme?.themeFamily} size={14} className="shrink-0" />
              {!holidayTheme && <span className="w-1.5 h-1.5 rounded-full accent-bg animate-pulse shrink-0" />}
              <span className="truncate">Today · {todayLabel}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black italic tracking-tight text-[var(--fios-text)] break-words">
              {greeting}, <span className="accent-text">{preferredName}</span>.
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-medium mt-1">
              Welcome back to <span className="text-[var(--fios-text)] font-bold">Fios</span> · Semester 1 · 2026/27
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl px-4 py-2.5 flex items-center gap-4 self-start md:self-auto font-mono shadow-sm dark:shadow-none">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Semester Progress</div>
            <div className="text-xs font-bold accent-solid-text">3% Completed</div>
          </div>
          <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full accent-bg w-[3%]" />
          </div>
        </div>
      </motion.div>

      {/* Weekly study goal — hero-adjacent strip (not a sidebar orphan) */}
      <WeeklyGoalWidget variant="strip" />

      {/* 2. Focus Card */}
      <div className="bg-card/90 border border-border rounded-2xl p-4 sm:p-6 relative overflow-hidden space-y-4 shadow-sm dark:shadow-none">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--fios-accent-from)] via-[var(--fios-accent-via)] to-transparent" />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest accent-solid-text flex items-center gap-2 font-mono min-w-0">
            <Zap className="w-3.5 h-3.5 shrink-0" /> Focus · What should I work on right now?
          </span>
          <span className="text-xs font-mono text-muted-foreground shrink-0">
            {loadingTasks ? '…' : `${pendingTaskCount} pending tasks`}
          </span>
        </div>

        <div className="space-y-1">
          {loadingTasks ? (
            <>
              <h2 className="text-2xl font-black italic uppercase tracking-wide text-muted-foreground animate-pulse">
                Loading tasks…
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm">Checking your academic task list.</p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-black italic uppercase tracking-wide text-foreground">
                {pendingTaskCount > 0 ? `${pendingTaskCount} active academic tasks pending` : "You're all caught up."}
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm">
                {pendingTaskCount > 0
                  ? 'Review pending coursework below or convert your lecture slides into active recall cards.'
                  : 'No urgent coursework or upcoming exams need immediate attention today.'}
              </p>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => onOpenFlashcards()}
            className="px-5 py-3 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase tracking-wider text-xs rounded-xl shadow-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-slate-950" /> Generate Flashcards ↵
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setIsAddingTask((v) => {
                const next = !v;
                if (next && !newTaskDueAt) {
                  const due = new Date();
                  due.setHours(due.getHours() + 2, 0, 0, 0);
                  setNewTaskDueAt(toDatetimeLocalValue(due));
                  const start = new Date(due.getTime() - 30 * 60 * 1000);
                  setNewTaskStart(toDatetimeLocalValue(start));
                }
                return next;
              });
            }}
            className="px-5 py-3 bg-secondary/60 hover:bg-muted/60 border border-border/50 text-foreground font-bold uppercase tracking-wider text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4 accent-solid-text" /> Add Task
          </motion.button>
        </div>
      </div>

      {/* 2B. Add Task Drawer */}
      {isAddingTask && (
        <form onSubmit={handleAddTask} className="bg-card border fios-border rounded-2xl p-5 shadow-sm dark:shadow-none space-y-3">
          <div className="flex items-center justify-between font-mono">
            <span className="text-xs font-black uppercase accent-solid-text flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" /> Create new academic task
            </span>
            <button type="button" onClick={() => setIsAddingTask(false)} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">Cancel</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Task title (e.g., Complete C Pointers Exercise)…"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="sm:col-span-2 bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground focus:outline-none focus:accent-border"
              autoFocus
            />
            <label className="space-y-1 block" htmlFor="fios-task-start">
              <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Start (optional)</span>
              <DatetimeLocalInput
                id="fios-task-start"
                value={newTaskStart}
                onChange={setNewTaskStart}
                aria-label="Task start date and time"
              />
            </label>
            <label className="space-y-1 block" htmlFor="fios-task-due">
              <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Due date & time *</span>
              <DatetimeLocalInput
                id="fios-task-due"
                value={newTaskDueAt}
                onChange={setNewTaskDueAt}
                required
                aria-label="Task due date and time"
              />
            </label>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground">Timed tasks appear on the unified agenda interleaved with classes.</p>
          <div className="flex justify-end">
            <button type="submit" className="px-5 py-2 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-xl transition-colors cursor-pointer">
              Save Task
            </button>
          </div>
        </form>
      )}

      {/* 3. Timetable & Academic Tasks (Prioritized Above the Fold) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card/60 border border-border/80 rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div>
              <div className="text-[10px] font-black font-mono uppercase tracking-widest accent-solid-text mb-0.5">Unified agenda</div>
              <h3 className="text-lg font-black italic uppercase tracking-wide text-foreground">Today's timeline</h3>
            </div>
            <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 accent-solid-text" /> {new Date().toLocaleDateString('en-GB', { weekday: 'short' })}
            </span>
          </div>
          <CompactAgenda
            classes={todayClasses}
            tasks={tasks}
            modules={moduleColorList}
            loading={loadingClasses || loadingTasks}
            day={todayAnchor}
            limit={20}
            emptyMessage="No classes or timed tasks for today."
            onToggleTask={handleToggleTask}
          />
        </div>

        <div className="bg-card/60 border border-border/80 rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-sm dark:shadow-none">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <div className="text-[10px] font-black font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Academic Tasks · Reminders</div>
                <h3 className="text-lg font-black italic uppercase tracking-wide text-foreground">Upcoming work</h3>
              </div>
              <span className="text-[10px] font-mono font-bold accent-solid-text bg-card border fios-border px-2 py-1 rounded">
                {loadingTasks ? '…' : `${pendingTaskCount} Active`}
              </span>
            </div>

            {loadingTasks ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                <p className="text-xs font-mono text-muted-foreground animate-pulse">Loading tasks…</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 opacity-40 accent-solid-text" />
                <p className="text-xs font-medium text-muted-foreground">No active tasks pending. Click "Add Task" to log coursework.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                      task.completed ? 'bg-background/50 border-border/50 opacity-40' : 'bg-background border-border hover:border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <button
                        onClick={() => handleToggleTask(task.id, task.completed)}
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                          task.completed ? 'accent-bg border-transparent text-slate-950' : 'border-border hover:border-slate-400'
                        }`}
                      >
                        {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                      <span className={`text-xs font-mono font-medium truncate ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(task.due_at || task.due_date) && <span className="text-[10px] font-mono text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded">{task.due_at ? new Date(task.due_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : task.due_date}</span>}
                      <button onClick={() => handleDeleteTask(task.id)} className="text-muted-foreground hover:text-rose-400 transition-colors p-1 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ReportContentButton
                        targetType="task"
                        targetId={task.id}
                        targetLabel={task.title}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border/60 flex items-center justify-between font-mono">
            <span className="text-[11px] text-muted-foreground">{loadingTasks ? '…' : `${pendingTaskCount} active tasks`}</span>
            <button onClick={() => setIsAddingTask(true)} className="text-xs accent-solid-text hover:underline cursor-pointer flex items-center gap-1">+ Add new task</button>
          </div>
        </div>
      </div>

      {/* Modular widgets — toggle / reorder via Preferences */}
      <div className="rounded-2xl border fios-border bg-card p-4 space-y-3 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Dashboard widgets</h3>
          <div className="flex flex-wrap gap-1.5">
            {(widgetOrder?.length ? widgetOrder : DEFAULT_WIDGET_ORDER).map((id) => (
              <div key={id} className="flex items-center gap-0.5 rounded-lg border fios-border bg-[var(--fios-surface-2)] px-1.5 py-1">
                <button type="button" onClick={() => moveWidget(id, -1)} className="p-0.5 text-muted-foreground cursor-pointer" aria-label={`Move ${id} up`}>
                  <GripVertical className="w-3 h-3" />
                </button>
                <span className="text-[10px] font-mono font-bold text-[var(--fios-text)] px-1">{WIDGET_LABELS[id]}</span>
                <button
                  type="button"
                  onClick={() => setWidgetVisible(id, widgetVisibility[id] === false)}
                  className="p-0.5 cursor-pointer text-muted-foreground"
                  aria-label={`Toggle ${id}`}
                >
                  {widgetVisibility[id] === false ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3 accent-solid-text" />}
                </button>
                <button type="button" onClick={() => moveWidget(id, 1)} className="p-0.5 text-muted-foreground cursor-pointer text-[10px] font-mono" aria-label={`Move ${id} down`}>
                  ↓
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          {orderedWidgets.map((id) => renderWidget(id))}
        </div>
      </div>

      {/* Study streak + exam countdown (below flight plan / widgets).
          min-w-0 on items: prevent CSS grid min-width:auto from expanding past the viewport
          and getting clipped by DashboardLayout overflow-x-hidden (broken mobile heatmap). */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
        <div className="min-w-0 max-w-full">
          <StudyStreakHeatmap />
        </div>
        <div className="min-w-0 max-w-full">
          <ExamCountdownWidget />
        </div>
      </div>

      {/* Saved Study Decks */}
      <div className="bg-card/60 border border-border/80 rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black font-mono uppercase tracking-widest accent-solid-text mb-1 flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5" /> Saved Decks
            </div>
            <h3 className="text-lg font-black italic uppercase tracking-wide text-foreground">Recent revision decks</h3>
          </div>
          <button onClick={() => onOpenFlashcards()} className="text-xs font-mono accent-solid-text hover:underline cursor-pointer flex items-center gap-1">
            Study Lab <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {loadingDecks ? (
          <div className="py-8 text-center text-xs font-mono text-muted-foreground animate-pulse">Loading saved decks…</div>
        ) : savedDecks.length === 0 ? (
          <div className="py-8 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center space-y-2">
            <Layers className="w-8 h-8 text-muted-foreground" />
            <p className="text-xs text-muted-foreground font-medium">No saved flashcard decks yet.</p>
            <button onClick={() => onOpenFlashcards()} className="text-xs accent-solid-text font-bold uppercase tracking-wider hover:underline cursor-pointer font-mono">
              Create your first deck →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {savedDecks.map((deck) => (
              <motion.div
                key={deck.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => onOpenFlashcards(deck.cards, deck.title, deck.module_code, true)}
                className="bg-background/80 border border-border hover:accent-border p-4 rounded-xl transition-colors cursor-pointer group flex flex-col justify-between space-y-3"
              >
                <div>
                  <span className="text-[9px] font-black font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-card accent-solid-text border fios-border">
                    {deck.cards?.length || 0} Cards
                  </span>
                        <h4 className="text-sm font-black text-foreground group-hover:accent-solid-text transition-colors mt-2 line-clamp-1 truncate max-w-full">{deck.title}</h4>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground flex items-center justify-between">
                  <span>{new Date(deck.created_at).toLocaleDateString('en-GB')}</span>
                  <span className="accent-solid-text font-bold">Study →</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 7. Stats Footer (Hidden on mobile to avoid bottom nav overlap, visible on desktop) */}
      <div className="hidden md:grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="bg-card/80 border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm dark:shadow-none">
          <div className="p-2.5 rounded-lg bg-secondary/60 border border-border/50"><Clock className="w-4 h-4 accent-solid-text" /></div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Tasks</div>
            <div className="text-sm font-black text-foreground">{loadingTasks ? '…' : `${pendingTaskCount} Tasks`}</div>
          </div>
        </div>
        <div className="bg-card/80 border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm dark:shadow-none">
          <div className="p-2.5 rounded-lg bg-secondary/60 border border-border/50"><Layers className="w-4 h-4 accent-solid-text" /></div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Saved Decks</div>
            <div className="text-sm font-black text-foreground">{savedDecks.length} Decks</div>
          </div>
        </div>
        <div className="bg-card/80 border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm dark:shadow-none">
          <div className="p-2.5 rounded-lg bg-secondary/60 border border-border/50"><Zap className="w-4 h-4 accent-solid-text" /></div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Focus Sessions</div>
            <div className="text-sm font-black text-foreground">Live</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const OverviewTab = React.memo(OverviewTabInner);
export default OverviewTab;