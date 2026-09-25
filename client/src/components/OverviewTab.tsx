import React, { useState, useEffect } from 'react';
import { 
  Zap, Plus, ArrowRight, Calendar, CheckCircle2, 
  Clock, Layers, FolderKanban, Trash2, MapPin, Sparkles, Check 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getSavedCalendarUrl, fetchAndParseCalendar, CalendarEvent } from '../lib/calendarService';

interface OverviewTabProps {
  onOpenFlashcards: (
    deckCards?: any[],
    title?: string,
    moduleCode?: string,
    isSaved?: boolean
  ) => void;
}

interface SavedDeck {
  id: string;
  title: string;
  module_code?: string;
  created_at: string;
  cards?: { id: string; question?: string; answer?: string; front?: string; back?: string }[];
}

interface Task {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ onOpenFlashcards }) => {
  const [userName, setUserName] = useState<string>('ORYN');
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState<boolean>(true);

  // Timetable State
  const [todayClasses, setTodayClasses] = useState<CalendarEvent[]>([]);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(true);

  // Academic Tasks State (Persisted in localStorage)
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('fios_user_tasks');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Submit Software Quality & Testing repeat documentation', dueDate: 'Tomorrow', completed: false },
      { id: '2', title: 'Review Systems Analysis Methods lecture slides', dueDate: 'In 3 days', completed: false }
    ];
  });
  const [isAddingTask, setIsAddingTask] = useState<boolean>(false);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskDue, setNewTaskDue] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('fios_user_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    // 1. Fetch authenticated user profile name
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const namePrefix = user.email.split('@')[0].toUpperCase();
        setUserName(namePrefix);
      }
    };

    // 2. Query saved decks from Supabase (including full card columns)
    const fetchDecks = async () => {
      setLoadingDecks(true);
      const { data, error } = await supabase
        .from('decks')
        .select('*, cards(*)')
        .order('created_at', { ascending: false })
        .limit(3);

      if (!error && data) {
        setSavedDecks(data);
      }
      setLoadingDecks(false);
    };

    // 3. Query Today's Timetable Events from saved iCal feed
    const fetchSchedule = async () => {
      setLoadingClasses(true);
      try {
        const savedUrl = await getSavedCalendarUrl();
        if (savedUrl) {
          const events = await fetchAndParseCalendar(savedUrl);
          const now = new Date();
          const todayEvents = events.filter(e => 
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

    fetchUserData();
    fetchDecks();
    fetchSchedule();
  }, []);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      dueDate: newTaskDue.trim() || 'Today',
      completed: false
    };
    setTasks([newTask, ...tasks]);
    setNewTaskTitle('');
    setNewTaskDue('');
    setIsAddingTask(false);
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const pendingTaskCount = tasks.filter(t => !t.completed).length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans text-slate-100">
      
      {/* 1. Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="text-[11px] font-black uppercase tracking-widest text-emerald-400 mb-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            TODAY · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tight text-white">
            GOOD EVENING, {userName}.
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1">
            SEMESTER 1 · 2026/27 · <span className="text-slate-200">WEEK 2</span>
          </p>
        </div>

        {/* Top Progress Pill */}
        <div className="bg-[#0e131f] border border-slate-800 rounded-xl px-4 py-2.5 flex items-center gap-4 self-start md:self-auto font-mono">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">SEMESTER PROGRESS</div>
            <div className="text-xs font-bold text-emerald-400">3% COMPLETED</div>
          </div>
          <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 w-[3%]" />
          </div>
        </div>
      </div>

      {/* 2. Focus Card */}
      <div className="bg-[#0e131f]/90 border border-slate-800 rounded-2xl p-6 relative overflow-hidden space-y-4 shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-cyan-400 to-transparent" />
        
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2 font-mono">
            <Zap className="w-3.5 h-3.5" />
            FOCUS · WHAT SHOULD I WORK ON RIGHT NOW?
          </span>
          <span className="text-xs font-mono text-slate-500">{pendingTaskCount} PENDING TASKS</span>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black italic uppercase tracking-wide text-white">
            {pendingTaskCount > 0 ? `${pendingTaskCount} ACTIVE ACADEMIC TASKS PENDING` : "YOU'RE ALL CAUGHT UP."}
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            {pendingTaskCount > 0 
              ? 'Review pending coursework deliverables below or convert your lecture slides into active recall cards.'
              : 'No urgent coursework or upcoming exams need immediate attention today.'}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => onOpenFlashcards()}
            className="px-5 py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black italic uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            Generate Flashcards ↵
          </button>
          
          <button 
            onClick={() => setIsAddingTask(!isAddingTask)}
            className="px-5 py-3 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 text-slate-200 font-bold uppercase tracking-wider text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            Add Task
          </button>
        </div>
      </div>

      {/* 2B. Add Task Modal Drawer */}
      {isAddingTask && (
        <form onSubmit={handleAddTask} className="bg-[#0e131f] border border-cyan-500/50 rounded-2xl p-5 shadow-2xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between font-mono">
            <span className="text-xs font-black uppercase text-cyan-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" /> CREATE NEW ACADEMIC TASK
            </span>
            <button type="button" onClick={() => setIsAddingTask(false)} className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer">CANCEL</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Task title (e.g., Complete C Pointers Exercise)..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="sm:col-span-2 bg-[#07090e] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
              autoFocus
            />
            <input
              type="text"
              placeholder="Due date (e.g., Friday 5 PM)..."
              value={newTaskDue}
              onChange={(e) => setNewTaskDue(e.target.value)}
              className="bg-[#07090e] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black italic uppercase text-xs rounded-xl transition-all cursor-pointer">
              Save Task
            </button>
          </div>
        </form>
      )}

      {/* 3. Saved Study Decks Section */}
      <div className="bg-[#0e131f]/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black font-mono uppercase tracking-widest text-emerald-400 mb-1 flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5" /> SAVED DECKS
            </div>
            <h3 className="text-lg font-black italic uppercase tracking-wide text-white">
              RECENT REVISION DECKS
            </h3>
          </div>
          <button 
            onClick={() => onOpenFlashcards()}
            className="text-xs font-mono text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
          >
            STUDY LAB <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {loadingDecks ? (
          <div className="py-8 text-center text-xs font-mono text-slate-500 animate-pulse">
            LOADING SAVED DECKS FROM SUPABASE...
          </div>
        ) : savedDecks.length === 0 ? (
          <div className="py-8 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center space-y-2">
            <Layers className="w-8 h-8 text-slate-600" />
            <p className="text-xs text-slate-400 font-medium">No saved flashcard decks yet.</p>
            <button
              onClick={() => onOpenFlashcards()}
              className="text-xs text-emerald-400 font-bold uppercase tracking-wider hover:underline cursor-pointer font-mono"
            >
              Create your first deck →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {savedDecks.map((deck) => (
              <div 
                key={deck.id}
                onClick={() => onOpenFlashcards(deck.cards, deck.title, deck.module_code, true)}
                className="bg-[#07090e]/80 border border-slate-800 hover:border-emerald-400/50 p-4 rounded-xl transition-all cursor-pointer group flex flex-col justify-between space-y-3"
              >
                <div>
                  <span className="text-[9px] font-black font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {deck.cards?.length || 0} CARDS
                  </span>
                  <h4 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors mt-2 line-clamp-1">
                    {deck.title}
                  </h4>
                </div>
                <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between">
                  <span>{new Date(deck.created_at).toLocaleDateString('en-GB')}</span>
                  <span className="text-emerald-400 font-bold group-hover:translate-x-1 transition-transform">STUDY →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Tasks & Timetable Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Academic Tasks */}
        <div className="bg-[#0e131f]/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-xl">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <div className="text-[10px] font-black font-mono uppercase tracking-widest text-slate-400 mb-0.5">
                  ACADEMIC TASKS · REMINDERS
                </div>
                <h3 className="text-lg font-black italic uppercase tracking-wide text-white">
                  UPCOMING WORK
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-2 py-1 rounded">
                {pendingTaskCount} ACTIVE
              </span>
            </div>

            {tasks.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400/40" />
                <p className="text-xs font-medium text-slate-400">
                  No active tasks pending. Click "+ Add Task" to log coursework.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {tasks.map((task) => (
                  <div 
                    key={task.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      task.completed 
                        ? 'bg-[#07090e]/50 border-slate-800/50 opacity-40' 
                        : 'bg-[#07090e] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <button 
                        onClick={() => toggleTask(task.id)}
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                          task.completed ? 'bg-emerald-400 border-emerald-400 text-slate-950' : 'border-slate-600 hover:border-slate-400'
                        }`}
                      >
                        {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                      <span className={`text-xs font-mono font-medium truncate ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded">
                        {task.dueDate}
                      </span>
                      <button 
                        onClick={() => deleteTask(task.id)}
                        className="text-slate-600 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between font-mono">
            <span className="text-[11px] text-slate-500">{pendingTaskCount} ACTIVE TASKS</span>
            <button 
              onClick={() => setIsAddingTask(true)}
              className="text-xs text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              + ADD NEW TASK
            </button>
          </div>
        </div>

        {/* Right: Dynamic Today's Classes */}
        <div className="bg-[#0e131f]/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <div className="text-[10px] font-black font-mono uppercase tracking-widest text-emerald-400 mb-0.5">
                SCHEDULE
              </div>
              <h3 className="text-lg font-black italic uppercase tracking-wide text-white">
                TODAY'S CLASSES
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" /> {new Date().toLocaleDateString('en-GB', { weekday: 'short' })}
            </span>
          </div>

          {loadingClasses ? (
            <div className="py-12 text-center text-xs font-mono text-slate-500 animate-pulse">
              Syncing today's classes from iCal feed...
            </div>
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
                    <div className="text-[10px] font-mono font-bold text-slate-400">
                      {formatTime(item.startDate)} - {formatTime(item.endDate)}
                    </div>
                    <div className="text-xs font-black text-white truncate">{item.title}</div>
                    {item.location && (
                      <div className="text-[11px] font-mono text-cyan-400 flex items-center gap-1 font-semibold truncate">
                        <MapPin className="w-3 h-3 text-cyan-500 shrink-0" /> {item.location}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] font-black font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    SCHEDULED
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 5. Live Stats Footer Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="bg-[#0e131f]/80 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">ACTIVE TASKS</div>
            <div className="text-sm font-black text-white">{pendingTaskCount} Tasks</div>
          </div>
        </div>

        <div className="bg-[#0e131f]/80 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">SAVED DECKS</div>
            <div className="text-sm font-black text-white">{savedDecks.length} Decks</div>
          </div>
        </div>

        <div className="bg-[#0e131f]/80 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">ACTIVE MODULES</div>
            <div className="text-sm font-black text-white">Dynamic</div>
          </div>
        </div>
      </div>

    </div>
  );
};