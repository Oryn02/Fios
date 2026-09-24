import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { AuthModal } from './components/AuthModal';
import { generateFlashcards } from './services/api';
import { Flashcard } from './types/api';
import { FlashcardDeck } from './components/FlashcardDeck';
import { DashboardLayout } from './components/DashboardLayout';
import { OverviewTab } from './components/OverviewTab';

export function App() {
  // Auth Session State
  const [session, setSession] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // App UI State
  const [activeTab, setActiveTab] = useState('overview');
  const [studyNotes, setStudyNotes] = useState('');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Subscribe to Supabase Auth State Changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!studyNotes.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await generateFlashcards(studyNotes);
      const cardsList = Array.isArray(data) ? data : data?.cards || [];
      setCards(cardsList);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Initial Loader Screen during session validation
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-emerald-400 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          INITIALIZING FIOS SUITE...
        </div>
      </div>
    );
  }

  // 3. Unauthenticated View -> Render EA FC Auth Modal
  if (!session) {
    return <AuthModal onSuccess={() => setCheckingAuth(false)} />;
  }

  // 4. Authenticated View -> Render Full Command Center
  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'overview' && (
        <OverviewTab onOpenFlashcards={() => setActiveTab('flashcards')} />
      )}

      {activeTab === 'flashcards' && (
        <div className="space-y-8">
          {/* Header */}
          <header className="flex flex-col items-center text-center space-y-3 pt-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-sm bg-emerald-500/10 border-l-2 border-emerald-400 text-emerald-400 text-[11px] font-black uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ACADEMIC SUITE // STUDY LAB
            </div>
            <h1 className="text-4xl sm:text-5xl font-black italic tracking-tight text-white uppercase">
              FIOS <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">STUDIO</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm font-medium max-w-md">
              Convert lecture slides and study notes into high-contrast flashcards instantly.
            </p>
          </header>

          {/* Form Generator */}
          <form 
            onSubmit={handleGenerate}
            className="bg-[#0e131f]/90 backdrop-blur-xl border border-slate-800/80 rounded-xl p-6 shadow-2xl space-y-4 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                <span className="w-1 h-3 bg-emerald-400 rounded-xs" />
                Source Material
              </label>
              <span className="text-[11px] font-mono text-slate-500">
                {studyNotes.length} CHARS
              </span>
            </div>
            
            <textarea
              value={studyNotes}
              onChange={(e) => setStudyNotes(e.target.value)}
              placeholder="Paste your course notes or lecture slides here..."
              className="w-full h-44 p-4 bg-[#07090e]/90 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/50 resize-none font-mono text-xs sm:text-sm transition-all"
            />

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading || !studyNotes.trim()}
                className="flex-1 py-3.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black italic uppercase tracking-wider text-sm rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Generating Deck...
                  </>
                ) : (
                  'Generate Cards ↵'
                )}
              </button>
              
              {studyNotes && (
                <button
                  type="button"
                  onClick={() => setStudyNotes('')}
                  className="px-5 py-3.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-slate-300 font-bold uppercase tracking-wider text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </form>

          {/* Error */}
          {error && (
            <div className="p-4 bg-rose-500/10 border-l-4 border-rose-500 rounded-r-lg text-rose-300 text-xs font-bold tracking-wide uppercase">
              ⚠️ {error}
            </div>
          )}

          {/* Generated Deck Component */}
          {cards.length > 0 && <FlashcardDeck cards={cards} />}
        </div>
      )}

      {/* Placeholder states for future tabs */}
      {['schedule', 'modules', 'settings'].includes(activeTab) && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 bg-[#0e131f]/50 border border-slate-800 rounded-2xl p-8">
          <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest rounded">
            MODULE UNDER DEVELOPMENT
          </div>
          <h2 className="text-2xl font-black italic uppercase text-white">
            {activeTab.toUpperCase()} MODULE
          </h2>
          <p className="text-xs text-slate-400 max-w-sm">
            This module view will be wired up next as part of the Fios academic suite expansion.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}

export default App;