import React, { useState, useEffect } from 'react';
import { Flashcard } from '../types/api';
import { supabase } from '../lib/supabase';

interface FlashcardDeckProps {
  cards: Flashcard[];
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ cards }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [deckTitle, setDeckTitle] = useState('Generated Flashcard Deck');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Keyboard navigation for flipping and switching cards
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cards.length]);

  if (!cards || cards.length === 0) return null;

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleSaveDeck = async () => {
    setSaving(true);
    setSaveStatus(null);

    try {
      // 1. Get authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Authentication required to save decks.');
      }

      // 2. Create entry in decks table
      const { data: deck, error: deckError } = await supabase
        .from('decks')
        .insert({
          user_id: user.id,
          title: deckTitle.trim() || 'Untitled Deck'
        })
        .select()
        .single();

      if (deckError || !deck) {
        throw new Error(deckError?.message || 'Failed to create deck entry.');
      }

      // 3. Prepare and batch insert cards
      const cardRows = cards.map((card) => ({
        deck_id: deck.id,
        question: card.front || (card as any).question,
        answer: card.back || (card as any).answer
      }));

      const { error: cardsError } = await supabase
        .from('cards')
        .insert(cardRows);

      if (cardsError) {
        throw new Error(cardsError.message);
      }

      setSaveStatus({ type: 'success', message: 'Deck saved to your profile successfully!' });
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: err.message || 'Error saving deck to database.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto my-6">
      
      {/* Save Deck Action Header */}
      <div className="bg-[#0e131f] border border-slate-800/80 rounded-xl p-4 shadow-xl flex flex-col sm:flex-row items-center gap-3">
        <input
          type="text"
          value={deckTitle}
          onChange={(e) => setDeckTitle(e.target.value)}
          placeholder="Deck Title..."
          className="flex-1 w-full bg-[#07090e] border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-400 uppercase tracking-wider"
        />
        <button
          onClick={handleSaveDeck}
          disabled={saving}
          className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black italic uppercase tracking-wider text-xs rounded-lg transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
        >
          {saving ? (
            <>
              <span className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              SAVING...
            </>
          ) : (
            '💾 SAVE DECK'
          )}
        </button>
      </div>

      {/* Save Status Notification */}
      {saveStatus && (
        <div className={`p-3 rounded-lg text-xs font-bold tracking-wide uppercase border-l-4 ${
          saveStatus.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-400 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500 text-rose-300'
        }`}>
          {saveStatus.type === 'success' ? '✓' : '⚠️'} {saveStatus.message}
        </div>
      )}

      {/* Counter & Progress Bar */}
      <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-400 bg-[#0e131f]/60 px-4 py-2.5 rounded-lg border border-slate-800/80">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
          CARD <span className="text-white">{currentIndex + 1}</span> / {cards.length}
        </span>
        <div className="w-36 h-2 bg-slate-800 rounded-full overflow-hidden p-0.5">
          <div 
            className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full transition-all duration-300" 
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Flashcard Tile */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full h-72 bg-[#0e131f] rounded-xl p-8 flex flex-col justify-between text-center cursor-pointer border border-slate-800 hover:border-emerald-400/50 shadow-2xl transition-all duration-200 group relative overflow-hidden select-none active:scale-[0.99]"
      >
        {/* Glow corner indicator */}
        <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl ${isFlipped ? 'from-emerald-400/20' : 'from-cyan-400/20'} to-transparent rounded-tr-xl pointer-events-none`} />

        {/* Card Header Status */}
        <div className="w-full flex justify-between items-center z-10">
          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded border ${
            isFlipped 
              ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30' 
              : 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30'
          }`}>
            {isFlipped ? 'ANSWER' : 'QUESTION'}
          </span>
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider group-hover:text-slate-300 transition-colors">
            FLIP [SPACE]
          </span>
        </div>

        {/* Card Body Text */}
        <div className="my-auto px-2 z-10">
          {isFlipped ? (
            <p className="text-lg sm:text-xl font-bold text-emerald-300 leading-relaxed">
              {currentCard.back || (currentCard as any).answer}
            </p>
          ) : (
            <p className="text-lg sm:text-xl font-extrabold text-white leading-relaxed">
              {currentCard.front || (currentCard as any).question}
            </p>
          )}
        </div>

        {/* Bottom Banner Prompt */}
        <div className="w-full flex justify-center z-10">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest group-hover:text-slate-400 transition-colors">
            Click tile or press Space to flip card
          </span>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handlePrev}
          className="py-3.5 bg-[#0e131f] hover:bg-slate-800/80 border border-slate-800 text-slate-200 font-extrabold italic uppercase tracking-wider text-xs rounded-lg transition-colors cursor-pointer text-center active:scale-[0.98]"
        >
          ← PREVIOUS
        </button>

        <button
          onClick={handleNext}
          className="py-3.5 bg-[#0e131f] hover:bg-slate-800/80 border border-slate-800 text-slate-200 font-extrabold italic uppercase tracking-wider text-xs rounded-lg transition-colors cursor-pointer text-center active:scale-[0.98]"
        >
          NEXT →
        </button>
      </div>

    </div>
  );
};