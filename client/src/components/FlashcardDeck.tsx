import React, { useState, useEffect, useCallback } from 'react';
import { Flashcard } from '../types/api';
import { supabase } from '../lib/supabase';
import { getUserModules, DBModule } from '../lib/moduleService';
import { ActiveRecallQuiz } from './ActiveRecallQuiz';
import { FormattedContent } from './FormattedContent';
import { calculateSM2 } from '../lib/spacedRepetition';
import { Target, Eye, Save, CheckCircle2, AlertCircle, Folder, Clock, Layers } from 'lucide-react';

interface FlashcardDeckProps {
  cards: Flashcard[];
  isSaved?: boolean;
  deckTitle?: string;
  moduleCode?: string;
  deckId?: string;
}

const FlashcardDeckInner: React.FC<FlashcardDeckProps> = ({ 
  cards: initialCards, 
  isSaved = false, 
  deckTitle: initialTitle = 'Generated Flashcard Deck',
  moduleCode: initialModule = '',
  deckId
}) => {
  const [cards, setCards] = useState<Flashcard[]>(initialCards);
  const [mode, setMode] = useState<'browse' | 'test'>('browse');
  const [studyFilter, setStudyFilter] = useState<'due' | 'all'>('due');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [deckTitle, setDeckTitle] = useState(initialTitle);
  const [selectedModuleCode, setSelectedModuleCode] = useState<string>(initialModule);
  const [modules, setModules] = useState<DBModule[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(isSaved);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // If it's a saved deck, fetch live cards from Supabase on mount to ensure fresh SM-2 dates
  useEffect(() => {
    async function fetchLiveCards() {
      const firstCardId = (initialCards[0] as any)?.id;
      if (isSaved && firstCardId) {
        // Find parent deck ID or fetch cards for this deck
        const { data: cardData, error } = await supabase
          .from('cards')
          .select('*')
          .eq('deck_id', (initialCards[0] as any).deck_id || firstCardId); // fallback or direct match

        if (!error && cardData && cardData.length > 0) {
          const mapped = cardData.map((c: any) => ({
            id: c.id,
            front: c.question,
            back: c.answer,
            ease_factor: c.ease_factor ?? 2.5,
            interval: c.interval ?? 0,
            repetitions: c.repetitions ?? 0,
            next_review: c.next_review || new Date().toISOString(),
          }));
          setCards(mapped);
        }
      } else {
        setCards(initialCards);
      }
    }

    fetchLiveCards();
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [initialCards, isSaved]);

  useEffect(() => {
    async function fetchModules() {
      const userMods = await getUserModules();
      setModules(userMods);
    }
    if (!isSaved) fetchModules();
  }, [isSaved]);

  // SM-2 Due Filter calculation
  const nowIso = new Date().toISOString();
  const dueCards = cards.filter((c: any) => !c.next_review || c.next_review <= nowIso);
  const activeCards = studyFilter === 'due' ? dueCards : cards;

  const handleNext = useCallback(() => {
    setIsFlipped(false);
    if (activeCards.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % activeCards.length);
    }
  }, [activeCards.length]);

  const handlePrev = useCallback(() => {
    setIsFlipped(false);
    if (activeCards.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + activeCards.length) % activeCards.length);
    }
  }, [activeCards.length]);

  const handleToggleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleFlip();
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
  }, [handleToggleFlip, handleNext, handlePrev]);

  if (!cards || cards.length === 0) return null;

  const currentCard = activeCards[currentIndex] || activeCards[0];
  const questionText = currentCard?.front || (currentCard as any)?.question || '';
  const answerText = currentCard?.back || (currentCard as any)?.answer || '';

  const handleSaveDeck = async () => {
    setSaving(true);
    setSaveStatus(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Authentication required to save decks.');
      }

      const { data: deck, error: deckError } = await supabase
        .from('decks')
        .insert({
          user_id: user.id,
          title: deckTitle.trim() || 'Untitled Deck',
          module_code: selectedModuleCode || null
        })
        .select()
        .single();

      if (deckError || !deck) {
        throw new Error(deckError?.message || 'Failed to create deck entry.');
      }

      const cardRows = cards.map((card) => ({
        deck_id: deck.id,
        question: card.front || (card as any).question,
        answer: card.back || (card as any).answer,
        ease_factor: (card as any).ease_factor || 2.5,
        interval: (card as any).interval || 0,
        repetitions: (card as any).repetitions || 0,
        next_review: (card as any).next_review || new Date().toISOString(),
      }));

      const { data: insertedCards, error: cardsError } = await supabase
        .from('cards')
        .insert(cardRows)
        .select();

      if (cardsError) {
        throw new Error(cardsError.message);
      }

      if (insertedCards) {
        setCards(insertedCards.map((c: any) => ({
          id: c.id,
          front: c.question,
          back: c.answer,
          ease_factor: c.ease_factor,
          interval: c.interval,
          repetitions: c.repetitions,
          next_review: c.next_review,
        })));
      }

      setHasSaved(true);
      setSaveStatus({ type: 'success', message: 'Deck saved to your module successfully!' });
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: err.message || 'Error saving deck to database.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRating = async (rating: number) => {
    const updatedStats = calculateSM2(
      {
        easeFactor: (currentCard as any).ease_factor || 2.5,
        interval: (currentCard as any).interval || 0,
        repetitions: (currentCard as any).repetitions || 0,
        nextReview: (currentCard as any).next_review || new Date().toISOString(),
      },
      rating
    );

    // Update local card state immediately
    const cardIndexInAll = cards.findIndex(c => (c as any).id ? (c as any).id === (currentCard as any).id : c === currentCard);
    if (cardIndexInAll !== -1) {
      const updatedCards = [...cards];
      updatedCards[cardIndexInAll] = {
        ...currentCard,
        ease_factor: updatedStats.easeFactor,
        interval: updatedStats.interval,
        repetitions: updatedStats.repetitions,
        next_review: updatedStats.nextReview,
      } as any;
      setCards(updatedCards);
    }

    // Persist the new SM-2 schedule to Supabase with verification
    if ((currentCard as any)?.id) {
      const { error } = await supabase
        .from('cards')
        .update({
          ease_factor: updatedStats.easeFactor,
          interval: updatedStats.interval,
          repetitions: updatedStats.repetitions,
          next_review: updatedStats.nextReview,
        })
        .eq('id', (currentCard as any).id);

      if (error) {
        console.error("Failed to update card in Supabase:", error.message);
      }
    }

    handleNext();
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto my-6 font-sans">
      
      {/* 1. Dynamic Save / Info Header */}
      <div className="bg-[#0e131f] border border-slate-800/80 rounded-xl p-4 shadow-xl space-y-3">
        {!hasSaved ? (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              value={deckTitle}
              onChange={(e) => setDeckTitle(e.target.value)}
              placeholder="Deck Title..."
              className="flex-1 w-full bg-[#07090e] border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-400 uppercase tracking-wider font-mono"
            />

            <div className="flex items-center gap-1.5 bg-[#07090e] border border-slate-800 rounded-lg px-2.5 py-2 w-full sm:w-auto">
              <Folder className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <select
                value={selectedModuleCode}
                onChange={(e) => setSelectedModuleCode(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-slate-200 focus:outline-none cursor-pointer w-full"
              >
                <option value="" className="bg-[#07090e] text-slate-400">General (No Module)</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.code} className="bg-[#07090e] text-emerald-400 font-bold">
                    {m.code}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSaveDeck}
              disabled={saving}
              className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-[var(--fios-accent-from)] via-[var(--fios-accent-via)] to-[var(--fios-accent-to)] hover:opacity-90 text-slate-950 font-black italic uppercase tracking-wider text-xs rounded-lg transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 shrink-0"
            >
              {saving ? (
                <>
                  <span className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  SAVING...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  SAVE DECK
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-emerald-400 bg-emerald-500/10 rounded border border-emerald-500/20">
                {selectedModuleCode || 'General'}
              </span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wide truncate max-w-xs">
                {deckTitle}
              </h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> SAVED
            </span>
          </div>
        )}

        {/* Study Filter & Mode Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-slate-800/60 gap-3">
          <div className="flex items-center gap-1 bg-[#07090e] p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => { setStudyFilter('due'); setCurrentIndex(0); }}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                studyFilter === 'due' ? 'bg-cyan-400 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Due Today ({dueCards.length})
            </button>
            <button
              onClick={() => { setStudyFilter('all'); setCurrentIndex(0); }}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                studyFilter === 'all' ? 'bg-cyan-400 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> All ({cards.length})
            </button>
          </div>

          <div className="flex items-center gap-1 bg-[#07090e] p-1 rounded-xl border border-slate-800 w-full sm:w-auto justify-end">
            <button
              onClick={() => setMode('browse')}
              className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'browse' ? 'bg-emerald-400 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Browse
            </button>
            <button
              onClick={() => setMode('test')}
              className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'test' ? 'bg-emerald-400 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Target className="w-3.5 h-3.5" /> Recall
            </button>
          </div>
        </div>
      </div>

      {/* Save Status Banner */}
      {saveStatus && (
        <div className={`p-3 rounded-lg text-xs font-bold tracking-wide uppercase border-l-4 flex items-center gap-2 ${
          saveStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-400 text-emerald-300' : 'bg-rose-500/10 border-rose-500 text-rose-300'
        }`}>
          {saveStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {saveStatus.message}
        </div>
      )}

      {/* Main View Switcher */}
      {mode === 'test' ? (
        <ActiveRecallQuiz cards={activeCards} onFinish={() => setMode('browse')} />
      ) : activeCards.length === 0 ? (
        <div className="text-center py-12 space-y-3 bg-[#0e131f] border border-slate-800 rounded-xl p-6">
          <h3 className="text-base font-bold text-white uppercase">All caught up! 🎉</h3>
          <p className="text-xs text-slate-400">No flashcards are due for review today according to your SM-2 schedule.</p>
          <button 
            onClick={() => setStudyFilter('all')}
            className="px-4 py-2 bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
          >
            Study All Cards Anyway
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-400 bg-[#0e131f]/60 px-4 py-2.5 rounded-lg border border-slate-800/80 font-mono">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
              CARD <span className="text-white">{currentIndex + 1}</span> / {activeCards.length}
            </span>
            <div className="w-36 h-2 bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-[var(--fios-accent-from)] via-[var(--fios-accent-via)] to-[var(--fios-accent-to)] rounded-full transition-all duration-300" 
                style={{ width: `${((currentIndex + 1) / activeCards.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Flashcard Tile */}
          <div
            onClick={handleToggleFlip}
            className="w-full min-h-[280px] bg-[#0e131f] rounded-xl p-6 flex flex-col justify-between text-center cursor-pointer border border-slate-800 hover:border-emerald-400/50 shadow-2xl transition-all duration-200 group relative overflow-hidden select-none active:scale-[0.99]"
          >
            <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl ${isFlipped ? 'from-emerald-400/20' : 'from-cyan-400/20'} to-transparent rounded-tr-xl pointer-events-none`} />

            <div className="w-full flex justify-between items-center z-10 font-mono">
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded border ${
                isFlipped ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30' : 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30'
              }`}>
                {isFlipped ? 'ANSWER' : 'QUESTION'}
              </span>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider group-hover:text-slate-300 transition-colors">
                FLIP [SPACE]
              </span>
            </div>

            <div className="my-auto px-2 z-10 text-left sm:text-center">
              <FormattedContent text={isFlipped ? answerText : questionText} />
            </div>

            <div className="w-full flex justify-center z-10 font-mono pt-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest group-hover:text-slate-400 transition-colors">
                Click tile or press Space to flip card
              </span>
            </div>
          </div>

          {/* SM-2 Spaced Repetition Rating Buttons */}
          {isFlipped ? (
            <div className="space-y-2">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 text-center">
                Rate Recall Difficulty (Spaced Repetition)
              </div>
              <div className="grid grid-cols-4 gap-2 font-mono">
                <button
                  onClick={() => handleRating(1)}
                  className="py-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  AGAIN (1d)
                </button>
                <button
                  onClick={() => handleRating(2)}
                  className="py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  HARD
                </button>
                <button
                  onClick={() => handleRating(3)}
                  className="py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  GOOD
                </button>
                <button
                  onClick={() => handleRating(4)}
                  className="py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  EASY
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 font-mono">
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
          )}
        </div>
      )}

    </div>
  );
};

export const FlashcardDeck = React.memo(FlashcardDeckInner);
export default FlashcardDeck;