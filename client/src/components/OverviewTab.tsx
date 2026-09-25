import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, Plus, ArrowRight, Calendar, CheckCircle2,
  Clock, Layers, FolderKanban, Trash2, MapPin, Sparkles, Check,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getSavedCalendarUrl, fetchAndParseCalendar, CalendarEvent } from '../lib/calendarService';
import { getTasks, createTask, toggleTask, deleteTask } from '../lib/taskService';
import { getUserDecksWithCards } from '../lib/deckService';
import type { Task } from '../types/db';
import { usePreferredName, useProfile } from '../context/ProfileContext';
import { Avatar } from './Avatar';
import { ModuleHeatmap } from './ModuleHeatmap';
import { RevisionFlightPlan } from './RevisionFlightPlan';

interface OverviewTabProps {
  onOpenFlashcards: (deckCards?: any[], title?: string, moduleCode?: string, isSaved?: boolean) => void;
  onNavigate?: (tab: string) => void;
}

interface SavedDeck {
  id: string;
  title: string;
  module_code?: string;
  created_at: string;
  cards?: { id: string; question?: string; answer?: string; front?: string; back?: string }[];
}

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const OverviewTabInner: React.FC<OverviewTabProps> = ({ onOpenFlashcards, onNavigate }) => {
  const preferredName = usePreferredName();
  const { profile } = useProfile();
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);

  const [todayClasses, setTodayClasses] = useState<CalendarEvent[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');

  const greeting = useMemo(() => greetingFor(new Date()), []);
  const todayLabel = useMemo(
    () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase(),
    []
  );

  useEffect(() => {
    getTasks().then(setTasks).catch((err) => console.error('Failed to load tasks:', err));

    const fetchDecks = async () => {
      setLoadingDecks(true);
      try {
        const data = await getUserDecksWithCards();
        setSavedDecks((data || []).slice(0, 3) as SavedDeck[]);
      } catch (err) {
        console.error('Failed to load decks:', err);
      } finally {
        setLoadingDecks(false);
      }
    };

    const fetchSchedule = async () => {
      setLoadingClasses(true);
      try {
        const savedUrl = await getSavedCalendarUrl();
        if (savedUrl) {
          const events = await fetchAndParseCalendar(savedUrl);
          const now = new Date();
          const todayEvents = events.filter((e) =>
            e.startDate.getFullYear() === now.getFullYear() &&
            e.startDate.getMonth() === now.getMonth() &&
            e.startDate.getDate() === now.getDate()
          ).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
          setTodayClasses(todayEvents);
        }
      } catch (err) {
        console.error('Failed to load today classes:', err);
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchDecks();
    fetchSchedule();
  }, []);

  const handleAddTask = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      const created = await createTask(newTaskTitle, newTaskDue || 'Today');
      setTasks((prev) => [created, ...prev]);
      setNewTaskTitle('');
      setNewTaskDue('');
      setIsAddingTask(false);
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  }, [newTaskTitle, newTaskDue]);

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

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans text-slate-100">
      {/* 1. Greeting Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-6"
      >
        <div className="flex items-center gap-4">
          <Avatar url={profile?.avatar_url} name={preferredName} size={56} className="shrink-0 accent-ring" />
          <div>
            <div className="text-[11px] font-black uppercase tracking-widest accent-solid-text mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full accent-bg animate-pulse" />
              Today · {todayLabel}
            </div>
            <h1 className="text-3xl sm:text-4xl font-black italic tracking-tight text-[var(--fios-text)]">
              {greeting}, <span className="accent-text">{preferredName}</span>.
            </h1>
            <p className="text-[var(--fios-text-muted)] text-xs sm:text-sm font-medium mt-1">
              Welcome back to <span className="text-[var(--fios-text)] font-bold">Fios</span> · Semester 1 · 2026/27
            </p>
          </div>
        </div>

        <div className="bg-[#0e131f] border border-slate-800 rounded-xl px-4 py-2.5 flex items-center gap-4 self-start md:self-auto font-mono">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Semester Progress</div>
            <div className="text-xs font-bold text-emerald-400">3% Completed</div>
          </div>
          <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 w-[3%]" />
          </div>
        </div>
      </motion.div>

      {/* 2. Focus Card */}
      <div className="bg-[#0e131f]/90 border border-slate-800 rounded-2xl p-6 relative overflow-hidden space-y-4 shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-cyan-400 to-transparent" />
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2 font-mono">
            <Zap className="w-3.5 h-3.5" /> Focus · What should I work on right now?
          </span>
          <span className="text-xs font-mono text-slate-500">{pendingTaskCount} pending tasks</span>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black italic uppercase tracking-wide text-white">
            {pendingTaskCount > 0 ? `${pendingTaskCount} active academic tasks pending` : "You're all caught up."}
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            {pendingTaskCount > 0
              ? 'Review pending coursework below or convert your lecture slides into active recall cards.'
              : 'No urgent coursework or upcoming exams need immediate attention today.'}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => onOpenFlashcards()}
            className="px-5 py-3 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-emerald-500/10 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-slate-950" /> Generate Flashcards ↵
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsAddingTask((v) => !v)}
            className="px-5 py-3 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 text-slate-200 font-bold uppercase tracking-wider text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-cyan-400" /> Add Task
          </motion.button>
        </div>
      </div>

      {/* 2B. Add Task Drawer */}
      {isAddingTask && (
        <form onSubmit={handleAddTask} className="bg-[#0e131f] border border-cyan-500/50 rounded-2xl p-5 shadow-2xl space-y-3">
          <div className="flex items-center justify-between font-mono">
            <span className="text-xs font-black uppercase text-cyan-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" /> Create new academic task
            </span>
            <button type="button" onClick={() => setIsAddingTask(false)} className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer">Cancel</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Task title (e.g., Complete C Pointers Exercise)…"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="sm:col-span-2 bg-[#07090e] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
              autoFocus
            />
            <input
              type="text"
              placeholder="Due date (e.g., Friday 5 PM)…"
              value={newTaskDue}
              onChange={(e) => setNewTaskDue(e.target.value)}
              className="bg-[#07090e] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="px-5 py-2 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase text-xs rounded-xl transition-colors cursor-pointer">
              Save Task
            </button>
          </div>
        </form>
      )}

      {/* Revision Flight Plan */}
      <RevisionFlightPlan onNavigate={(tab) => onNavigate?.(tab)} />

      {/* Module Readiness Heatmap */}
      <ModuleHeatmap />

      {/* 3. Saved Study Decks */}
      <div className="bg-[#0e131f]/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black font-mono uppercase tracking-widest text-emerald-400 mb-1 flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5" /> Saved Decks
            </div>
            <h3 className="text-lg font-black italic uppercase tracking-wide text-white">Recent revision decks</h3>
          </div>
          <button onClick={() => onOpenFlashcards()} className="text-xs font-mono text-emerald-400 hover:underline cursor-pointer flex items-center gap-1">
            Study Lab <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {loadingDecks ? (
          <div className="py-8 text-center text-xs font-mono text-slate-500 animate-pulse">Loading saved decks…</div>
        ) : savedDecks.length === 0 ? (
          <div className="py-8 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center space-y-2">
            <Layers className="w-8 h-8 text-slate-600" />
            <p className="text-xs text-slate-400 font-medium">No saved flashcard decks yet.</p>
            <button onClick={() => onOpenFlashcards()} className="text-xs text-emerald-400 font-bold uppercase tracking-wider hover:underline cursor-pointer font-mono">
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
                className="bg-[#07090e]/80 border border-slate-800 hover:border-emerald-400/50 p-4 rounded-xl transition-colors cursor-pointer group flex flex-col justify-between space-y-3"
              >
                <div>
                  <span className="text-[9px] font-black font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {deck.cards?.length || 0} Cards
                  </span>
                  <h4 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors mt-2 line-clamp-1">{deck.title}</h4>
                </div>
                <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between">
                  <span>{new Date(deck.created_at).toLocaleDateString('en-GB')}</span>
                  <span className="text-emerald-400 font-bold">Study →</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Tasks & Timetable */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0e131f]/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-xl">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <div className="text-[10px] font-black font-mono uppercase tracking-widest text-slate-400 mb-0.5">Academic Tasks · Reminders</div>
                <h3 className="text-lg font-black italic uppercase tracking-wide text-white">Upcoming work</h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-2 py-1 rounded">{pendingTaskCount} Active</span>
            </div>

            {tasks.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400/40" />
                <p className="text-xs font-medium text-slate-400">No active tasks pending. Click "Add Task" to log coursework.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                      task.completed ? 'bg-[#07090e]/50 border-slate-800/50 opacity-40' : 'bg-[#07090e] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <button
                        onClick={() => handleToggleTask(task.id, task.completed)}
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                          task.completed ? 'bg-emerald-400 border-emerald-400 text-slate-950' : 'border-slate-600 hover:border-slate-400'
                        }`}
                      >
                        {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                      <span className={`text-xs font-mono font-medium truncate ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>{task.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.due_date && <span className="text-[10px] font-mono text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded">{task.due_date}</span>}
                      <button onClick={() => handleDeleteTask(task.id)} className="text-slate-600 hover:text-rose-400 transition-colors p-1 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between font-mono">
            <span className="text-[11px] text-slate-500">{pendingTaskCount} active tasks</span>
            <button onClick={() => setIsAddingTask(true)} className="text-xs text-emerald-400 hover:underline cursor-pointer flex items-center gap-1">+ Add new task</button>
          </div>
        </div>

        <div className="bg-[#0e131f]/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <div className="text-[10px] font-black font-mono uppercase tracking-widest text-emerald-400 mb-0.5">Schedule</div>
              <h3 className="text-lg font-black italic uppercase tracking-wide text-white">Today's classes</h3>
            </div>
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" /> {new Date().toLocaleDateString('en-GB', { weekday: 'short' })}
            </span>
          </div>

          {loadingClasses ? (
            <div className="py-12 text-center text-xs font-mono text-slate-500 animate-pulse">Syncing today's classes…</div>
          ) : todayClasses.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
              <Calendar className="w-8 h-8 text-slate-600" />
              <p className="text-xs font-bold text-slate-400 uppercase">No classes scheduled for today</p>
              <p className="text-[11px] font-mono text-slate-600">Enjoy your focus time or study your flashcard decks.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {todayClasses.map((item) => (
                <div key={item.id} className="p-3.5 rounded-xl bg-[#07090e]/80 border border-slate-800/80 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-[10px] font-mono font-bold text-slate-400">{formatTime(item.startDate)} - {formatTime(item.endDate)}</div>
                    <div className="text-xs font-black text-white truncate">{item.title}</div>
                    {item.location && (
                      <div className="text-[11px] font-mono text-cyan-400 flex items-center gap-1 font-semibold truncate">
                        <MapPin className="w-3 h-3 text-cyan-500 shrink-0" /> {item.location}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] font-black font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">Scheduled</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. Stats Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="bg-[#0e131f]/80 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50"><Clock className="w-4 h-4 text-emerald-400" /></div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Tasks</div>
            <div className="text-sm font-black text-white">{pendingTaskCount} Tasks</div>
          </div>
        </div>
        <div className="bg-[#0e131f]/80 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50"><Layers className="w-4 h-4 text-cyan-400" /></div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saved Decks</div>
            <div className="text-sm font-black text-white">{savedDecks.length} Decks</div>
          </div>
        </div>
        <div className="bg-[#0e131f]/80 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50"><Zap className="w-4 h-4 text-emerald-400" /></div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Focus Sessions</div>
            <div className="text-sm font-black text-white">Live</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const OverviewTab = React.memo(OverviewTabInner);
export default OverviewTab;
