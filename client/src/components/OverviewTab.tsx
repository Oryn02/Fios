import React, { useState, useEffect } from 'react';
import { Zap, Plus, ArrowRight, Calendar, CheckCircle2, Clock, Layers, FolderKanban } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface OverviewTabProps {
  onOpenFlashcards: () => void;
}

interface SavedDeck {
  id: string;
  title: string;
  created_at: string;
  cards?: { id: string }[];
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ onOpenFlashcards }) => {
  const [userName, setUserName] = useState<string>('ORYN');
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState<boolean>(true);

  useEffect(() => {
    // 1. Fetch authenticated user profile name
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const namePrefix = user.email.split('@')[0].toUpperCase();
        setUserName(namePrefix);
      }
    };

    // 2. Query saved decks from Supabase PostgreSQL database
    const fetchDecks = async () => {
      setLoadingDecks(true);
      const { data, error } = await supabase
        .from('decks')
        .select('*, cards(id)')
        .order('created_at', { ascending: false })
        .limit(3);

      if (!error && data) {
        setSavedDecks(data);
      }
      setLoadingDecks(false);
    };

    fetchUserData();
    fetchDecks();
  }, []);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* 1. Time-Aware Personal Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="text-[11px] font-black uppercase tracking-widest text-emerald-400 mb-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            TODAY · THURSDAY, 24 SEPTEMBER 2026
          </div>
          <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tight text-white">
            GOOD EVENING, {userName}.
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1">
            SEMESTER 1 · 2026/27 · <span className="text-slate-200">WEEK 2</span>
          </p>
        </div>

        {/* Top Progress Pill */}
        <div className="bg-[#0e131f] border border-slate-800 rounded-xl px-4 py-2.5 flex items-center gap-4 self-start md:self-auto">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">SEMESTER PROGRESS</div>
            <div className="text-xs font-mono font-bold text-emerald-400">3% COMPLETED</div>
          </div>
          <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 w-[3%]" />
          </div>
        </div>
      </div>

      {/* 2. Focus Card: What to work on right now */}
      <div className="bg-[#0e131f]/90 border border-slate-800 rounded-2xl p-6 relative overflow-hidden space-y-4">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-cyan-400 to-transparent" />
        
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            FOCUS · WHAT SHOULD I WORK ON RIGHT NOW?
          </span>
          <span className="text-xs font-mono text-slate-500">0 PENDING DEADLINES</span>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black italic uppercase tracking-wide text-white">
            YOU'RE ALL CAUGHT UP.
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            No urgent coursework or upcoming exams need immediate attention today.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onOpenFlashcards}
            className="px-5 py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black italic uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            Generate Flashcards ↵
          </button>
          
          <button className="px-5 py-3 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 text-slate-200 font-bold uppercase tracking-wider text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* 3. Saved Study Decks Section (Dynamically Loaded from Supabase) */}
      <div className="bg-[#0e131f]/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1 flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5" /> SAVED DECKS
            </div>
            <h3 className="text-lg font-black italic uppercase tracking-wide text-white">
              RECENT REVISION DECKS
            </h3>
          </div>
          <button 
            onClick={onOpenFlashcards}
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
              onClick={onOpenFlashcards}
              className="text-xs text-emerald-400 font-bold uppercase tracking-wider hover:underline cursor-pointer"
            >
              Create your first deck →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {savedDecks.map((deck) => (
              <div 
                key={deck.id}
                onClick={onOpenFlashcards}
                className="bg-[#07090e]/80 border border-slate-800 hover:border-emerald-400/50 p-4 rounded-xl transition-all cursor-pointer group flex flex-col justify-between space-y-3"
              >
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {deck.cards?.length || 0} CARDS
                  </span>
                  <h4 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors mt-2 line-clamp-1">
                    {deck.title}
                  </h4>
                </div>
                <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between">
                  <span>{new Date(deck.created_at).toLocaleDateString()}</span>
                  <span className="text-emerald-400 font-bold group-hover:translate-x-1 transition-transform">STUDY →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Main Dashboard Grid: Tasks & Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Academic Tasks */}
        <div className="bg-[#0e131f]/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
              ACADEMIC TASKS · REMINDERS
            </div>
            <h3 className="text-lg font-black italic uppercase tracking-wide text-white">
              UPCOMING WORK
            </h3>
            
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400/40" />
              <p className="text-xs font-medium text-slate-400">
                No active tasks pending. Enjoy the downtime or review study decks.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-500">0 ACTIVE TASKS</span>
            <span className="text-xs font-mono text-emerald-400 hover:underline cursor-pointer flex items-center gap-1">
              VIEW ALL TASKS <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Right Column: Timetable / Today's Schedule */}
        <div className="bg-[#0e131f]/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">
                SCHEDULE
              </div>
              <h3 className="text-lg font-black italic uppercase tracking-wide text-white">
                TODAY'S CLASSES
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> TIMETABLE
            </span>
          </div>

          {/* Classes Timeline */}
          <div className="space-y-2.5">
            {[
              { time: '10:00 - 12:00', code: 'KSOFG2 B', name: 'Procedural Prog', loc: 'GA 0937 Language/Computer Lab', status: 'FINISHED' },
              { time: '13:00 - 14:00', code: 'KSOAG2', name: 'Software Quality and Testing', loc: 'GA 0995', status: 'FINISHED' },
              { time: '14:00 - 15:00', code: 'KSOAG2/KCDMG3', name: 'Systems Analysis Methods', loc: 'GA 0994', status: 'FINISHED' },
              { time: '15:00 - 17:00', code: 'KSOFG2 B', name: 'Cross Platform Application Development', loc: 'GA 0478 Computer Lab B', status: 'FINISHED' },
            ].map((cls, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-[#07090e]/80 border border-slate-800/80 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-mono font-bold text-slate-400">{cls.time}</div>
                  <div className="text-xs font-black text-white">{cls.code} {cls.name}</div>
                  <div className="text-[11px] font-mono text-slate-500">{cls.loc}</div>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                  {cls.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 5. Quick Stats Cards at Bottom */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'ACTIVE DEADLINES', val: '0 Deadlines', icon: Clock, color: 'text-emerald-400' },
          { label: 'SAVED DECKS', val: `${savedDecks.length} Decks`, icon: Layers, color: 'text-cyan-400' },
          { label: 'ACTIVE MODULES', val: '6 Modules', icon: Zap, color: 'text-emerald-400' },
        ].map((item, i) => (
          <div key={i} className="bg-[#0e131f]/80 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</div>
              <div className="text-sm font-black text-white">{item.val}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};