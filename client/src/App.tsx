import React, { useState } from 'react';
import { generateFlashcards } from './services/api';
import { Flashcard } from './types/api';
import { FlashcardDeck } from './components/FlashcardDeck';

export function App() {
  const [studyNotes, setStudyNotes] = useState('');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main className="min-h-screen bg-[#07090e] text-slate-100 p-4 sm:p-8 relative overflow-hidden font-sans select-none">
      {/* Dynamic EA Sports Ambient Background Flares */}
      <div className="absolute -top-24 -left-24 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        
        {/* Header Section with FIOS Logo Emblem */}
        <header className="flex flex-col items-center text-center space-y-3 pt-4">
          
          {/* FIOS Vector Logo Badge */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-400 to-cyan-400 p-[1.5px] shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-[#07090e] rounded-[10px] flex items-center justify-center">
                <span className="font-black italic text-transparent bg-clip-text bg-gradient-to-tr from-emerald-400 to-cyan-400 text-xl tracking-tighter">
                  F
                </span>
              </div>
            </div>
          </div>

          {/* Module Tagline */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-sm bg-emerald-500/10 border-l-2 border-emerald-400 text-emerald-400 text-[11px] font-black uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ACADEMIC SUITE // STUDY LAB
          </div>

          {/* Brand Title */}
          <h1 className="text-4xl sm:text-5xl font-black italic tracking-tight text-white uppercase">
            FIOS <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">STUDIO</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-medium max-w-md">
            Convert lecture slides and study notes into high-contrast flashcards instantly.
          </p>
        </header>

        {/* Input Card Container */}
        <form 
          onSubmit={handleGenerate}
          className="bg-[#0e131f]/90 backdrop-blur-xl border border-slate-800/80 rounded-xl p-6 shadow-2xl space-y-4 relative overflow-hidden"
        >
          {/* Top edge gradient accent */}
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

        {/* Error Feedback */}
        {error && (
          <div className="p-4 bg-rose-500/10 border-l-4 border-rose-500 rounded-r-lg text-rose-300 text-xs font-bold tracking-wide uppercase">
            ⚠️ {error}
          </div>
        )}

        {/* Generated Cards Output */}
        {cards.length > 0 && <FlashcardDeck cards={cards} />}

      </div>
    </main>
  );
}

export default App;