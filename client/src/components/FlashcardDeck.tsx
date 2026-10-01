import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Flashcard } from '../types/api';
import { supabase } from '../lib/supabase';
import { getUserModules, DBModule, moduleDisplayName } from '../lib/moduleService';
import { ActiveRecallQuiz } from './ActiveRecallQuiz';
import { FormattedContent } from './FormattedContent';
import { calculateSM2, isCardDue, previewIntervalLabel } from '../lib/spacedRepetition';
import { recordFlashcardReview } from '../lib/studyActivity';
import {
  buildDeckExport,
  downloadDeckJson,
  deckExportToShareCode,
  renameDeck,
} from '../lib/deckService';
import { InlineEditableTitle } from './InlineEditableTitle';
import { ReportContentButton } from './ReportContentButton';
import { Target, Eye, Save, CheckCircle2, AlertCircle, Folder, Clock, Layers, Info, HelpCircle, Download, Share2, BookOpen, Brain, MessageCircle, MoreHorizontal, Sparkles } from 'lucide-react';
import { toast } from '../lib/toast';
import { sanitizeDeckTitle } from '../lib/sanitizeDeckTitle';
import { fsrsReview, studyElaborate, studyFeynman, studyDualCode, saveJol } from '../services/studyApi';
import { AnkiExportButton } from './study/AnkiExportButton';
import { ShareModal } from './social/ShareModal';
import { SourceViewer } from './citations/SourceViewer';
import { CodeCardRunner } from './codeCards/CodeCardRunner';
import { SocraticTutorModal } from './tutor/SocraticTutorModal';
import { MnemonicModal } from './tutor/MnemonicModal';
import {
  enqueuePendingReview,
  ensureDailyQueueFlushHook,
  flushPendingReviews,
} from '../lib/offline/dailyQueueCache';

const SM2_ONBOARD_KEY = 'fios_sm2_onboarded';
const FSRS_PREF_KEY = 'fios_fsrs_opt_in';

function preferFsrs(card: any): boolean {
  if (card?.scheduler === 'fsrs') return true;
  try {
    return localStorage.getItem(FSRS_PREF_KEY) === '1';
  } catch {
    return false;
  }
}

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
  const [deckTitle, setDeckTitle] = useState(() => sanitizeDeckTitle(initialTitle, 'Generated Flashcard Deck'));
  const [selectedModuleCode, setSelectedModuleCode] = useState<string>(initialModule);
  const [modules, setModules] = useState<DBModule[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(isSaved);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [savedDeckId, setSavedDeckId] = useState<string | undefined>(
    deckId || (initialCards[0] as any)?.deck_id || undefined
  );
  const [showSm2Onboard, setShowSm2Onboard] = useState(() => {
    try {
      return localStorage.getItem(SM2_ONBOARD_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const [shareOpen, setShareOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [mnemonicOpen, setMnemonicOpen] = useState(false);
  const [jolPredicted, setJolPredicted] = useState<number | null>(null);
  const [hardFailStreak, setHardFailStreak] = useState(0);
  const [elaborateHint, setElaborateHint] = useState<string | null>(null);
  const [feynmanHint, setFeynmanHint] = useState<string | null>(null);
  const [dualHint, setDualHint] = useState<string | null>(null);
  const [studyBusy, setStudyBusy] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [aiActionsOpen, setAiActionsOpen] = useState(false);
  const [modeInfoOpen, setModeInfoOpen] = useState(false);

  useEffect(() => {
    ensureDailyQueueFlushHook();
  }, []);

  const dismissSm2Onboard = useCallback(() => {
    try {
      localStorage.setItem(SM2_ONBOARD_KEY, '1');
    } catch {
      /* ignore */
    }
    setShowSm2Onboard(false);
  }, []);

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
            deck_id: c.deck_id,
            front: c.question,
            back: c.answer,
            ease_factor: c.ease_factor ?? 2.5,
            interval: c.interval ?? 0,
            repetitions: c.repetitions ?? 0,
            next_review: c.next_review || new Date().toISOString(),
            scheduler: c.scheduler || 'sm2',
            fsrs_state: c.fsrs_state || null,
            source_page: c.source_page ?? null,
            source_paragraph: c.source_paragraph ?? null,
            source_quote: c.source_quote ?? null,
            source_document_id: c.source_document_id ?? null,
            card_type: c.card_type || 'basic',
            code_language: c.code_language ?? null,
            starter_code: c.starter_code ?? null,
            expected_output: c.expected_output ?? null,
            solution_code: c.solution_code ?? null,
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

  // SM-2 due filter — local calendar day (see isCardDue)
  // Interleaved practice: rotate by deck_id so same-deck cards are spaced apart.
  const dueCards = (Array.isArray(cards) ? cards : []).filter((c: any) => isCardDue(c?.next_review));
  const sourceCards = studyFilter === 'due' ? dueCards : (Array.isArray(cards) ? cards : []);
  const activeCards = (() => {
    const byDeck = new Map<string, any[]>();
    for (const c of sourceCards) {
      const key = String((c as any).deck_id || (c as any).module_code || 'default');
      const arr = byDeck.get(key) || [];
      arr.push(c);
      byDeck.set(key, arr);
    }
    if (byDeck.size <= 1) return sourceCards;
    const queues = [...byDeck.values()];
    const out: any[] = [];
    let left = sourceCards.length;
    while (left > 0) {
      for (const q of queues) {
        if (q.length) {
          out.push(q.shift());
          left -= 1;
        }
      }
    }
    return out;
  })();

  // Reset JOL / hints when card changes
  useEffect(() => {
    setJolPredicted(null);
    setElaborateHint(null);
    setFeynmanHint(null);
    setDualHint(null);
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    setIsFlipped(false);
    setAiActionsOpen(false);
    if (activeCards.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % activeCards.length);
    }
  }, [activeCards.length]);

  const handlePrev = useCallback(() => {
    setIsFlipped(false);
    setAiActionsOpen(false);
    if (activeCards.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + activeCards.length) % activeCards.length);
    }
  }, [activeCards.length]);

  const handleToggleFlip = useCallback(() => {
    setAiActionsOpen(false);
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

  const currentCard = activeCards[currentIndex] || activeCards[0] || cards[0];
  const questionText = currentCard?.front || (currentCard as any)?.question || '';
  const answerText = currentCard?.back || (currentCard as any)?.answer || '';
  const isCodeCard = (currentCard as any)?.card_type === 'code';
  const hasSource =
    Boolean((currentCard as any)?.source_page) || Boolean((currentCard as any)?.source_quote);

  const sm2Base = currentCard
    ? {
        easeFactor: (currentCard as any).ease_factor || 2.5,
        interval: (currentCard as any).interval || 0,
        repetitions: (currentCard as any).repetitions || 0,
        nextReview: (currentCard as any).next_review || new Date().toISOString(),
      }
    : { easeFactor: 2.5, interval: 0, repetitions: 0, nextReview: new Date().toISOString() };

  const ratingPreview = {
    1: previewIntervalLabel(sm2Base, 1),
    2: previewIntervalLabel(sm2Base, 2),
    3: previewIntervalLabel(sm2Base, 3),
    4: previewIntervalLabel(sm2Base, 4),
  };

  const handleRating = useCallback(async (rating: number) => {
    if (!currentCard) return;
    try {
      const { recordFsrsReview, recordFlashcardTouch } = await import('../lib/studyMilestones');
      if (preferFsrs(currentCard)) recordFsrsReview(1);
      else recordFlashcardTouch(1);
    } catch {
      /* optional milestone tracking */
    }
    const labels: Record<number, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };
    const useFsrs = preferFsrs(currentCard) && Boolean((currentCard as any)?.id);
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    const cardId = (currentCard as any)?.id as string | undefined;

    if (jolPredicted != null && cardId) {
      try {
        await saveJol({
          cardId,
          predicted: jolPredicted as 1 | 2 | 3 | 4 | 5,
          actualSuccess: rating >= 3,
        });
      } catch {
        /* optional */
      }
    }

    const nextHard = rating <= 2 ? hardFailStreak + 1 : 0;
    setHardFailStreak(nextHard);
    if (rating === 2 || nextHard >= 2) {
      try {
        const elab = await studyElaborate({
          front: questionText,
          back: answerText,
        });
        const hint = [elab.why, elab.connection, elab.prompt].filter(Boolean).join(' · ');
        if (hint) setElaborateHint(hint);
      } catch {
        /* optional */
      }
    }

    if (useFsrs) {
      if (offline && cardId) {
        try {
          await enqueuePendingReview({
            cardId,
            rating: rating as 1 | 2 | 3 | 4,
            createdAt: new Date().toISOString(),
          });
          recordFlashcardReview();
          toast(`Rated ${labels[rating] || rating} (queued offline)`, 'info');
          handleNext();
          return;
        } catch (e) {
          console.error(e);
        }
      }
      try {
        const result = await fsrsReview((currentCard as any).id, rating as 1 | 2 | 3 | 4);
        const cardIndexInAll = cards.findIndex(c => (c as any).id ? (c as any).id === (currentCard as any).id : c === currentCard);
        if (cardIndexInAll !== -1) {
          const updatedCards = [...cards];
          updatedCards[cardIndexInAll] = {
            ...currentCard,
            scheduler: 'fsrs',
            fsrs_state: result.fsrs_state,
            interval: result.interval,
            repetitions: result.repetitions,
            next_review: result.next_review,
          } as any;
          setCards(updatedCards);
        }
        recordFlashcardReview();
        void flushPendingReviews();
        toast(`Rated ${labels[rating] || rating} (FSRS)`, rating >= 3 ? 'success' : 'info');
        handleNext();
        return;
      } catch (err) {
        console.error(err);
        toast('FSRS sync failed — falling back to SM-2', 'info');
      }
    }

    const updatedStats = calculateSM2(
      {
        easeFactor: (currentCard as any).ease_factor || 2.5,
        interval: (currentCard as any).interval || 0,
        repetitions: (currentCard as any).repetitions || 0,
        nextReview: (currentCard as any).next_review || new Date().toISOString(),
      },
      rating
    );

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

    if (cardId) {
      if (offline) {
        try {
          await enqueuePendingReview({
            cardId,
            rating: rating as 1 | 2 | 3 | 4,
            sm2: {
              ease_factor: updatedStats.easeFactor,
              interval: updatedStats.interval,
              repetitions: updatedStats.repetitions,
              next_review: updatedStats.nextReview,
            },
            createdAt: new Date().toISOString(),
          });
          recordFlashcardReview();
          toast(`Rated ${labels[rating] || rating} (queued offline)`, 'info');
          handleNext();
          return;
        } catch (e) {
          console.error(e);
          toast('Could not queue offline review', 'error');
          return;
        }
      }

      const { error } = await supabase
        .from('cards')
        .update({
          ease_factor: updatedStats.easeFactor,
          interval: updatedStats.interval,
          repetitions: updatedStats.repetitions,
          next_review: updatedStats.nextReview,
        })
        .eq('id', cardId);

      if (error) {
        console.error("Failed to update card in Supabase:", error.message);
        toast('Could not sync SM-2 schedule', 'error');
        return;
      }
    }

    recordFlashcardReview();
    void flushPendingReviews();
    toast(`Rated ${labels[rating] || rating}`, rating >= 3 ? 'success' : 'info');
    handleNext();
  }, [cards, currentCard, handleNext, jolPredicted, hardFailStreak, questionText, answerText]);

  const handleExportJson = useCallback(() => {
    const payload = buildDeckExport(deckTitle, cards, selectedModuleCode || null);
    downloadDeckJson(payload);
    toast('Deck JSON downloaded', 'success');
  }, [deckTitle, cards, selectedModuleCode]);

  const handleCopyShareCode = useCallback(async () => {
    const payload = buildDeckExport(deckTitle, cards, selectedModuleCode || null);
    const code = deckExportToShareCode(payload);
    try {
      await navigator.clipboard.writeText(code);
      toast('Share code copied', 'success');
    } catch {
      toast('Could not copy — select the code manually', 'error');
    }
  }, [deckTitle, cards, selectedModuleCode]);

  const handleRename = useCallback(async (next: string) => {
    setDeckTitle(next);
    if (savedDeckId) {
      try {
        await renameDeck(savedDeckId, next);
        toast('Deck renamed', 'success');
      } catch (err: any) {
        toast(err?.message || 'Rename failed', 'error');
      }
    }
  }, [savedDeckId]);

  /**
   * Swipe-to-rate is touch/mobile only — desktop/PC (fine pointer + hover) keeps
   * tap-to-flip + Previous/Next + SM-2 buttons, with no swipe rating or swipe copy.
   */
  const [touchGestures, setTouchGestures] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(max-width: 767px)').matches
      || window.matchMedia('(hover: none)').matches
      || window.matchMedia('(pointer: coarse)').matches
    );
  });
  useEffect(() => {
    const mqs = [
      window.matchMedia('(max-width: 767px)'),
      window.matchMedia('(hover: none)'),
      window.matchMedia('(pointer: coarse)'),
    ];
    const sync = () => setTouchGestures(mqs.some((mq) => mq.matches));
    sync();
    mqs.forEach((mq) => mq.addEventListener('change', sync));
    return () => mqs.forEach((mq) => mq.removeEventListener('change', sync));
  }, []);

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!touchGestures) return;
    const t = e.changedTouches[0];
    if (!t) return;
    touchStart.current = { x: t.clientX, y: t.clientY };
  }, [touchGestures]);
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchGestures || touchStart.current == null || !isFlipped) return;
    const t = e.changedTouches[0];
    if (!t) {
      touchStart.current = null;
      return;
    }
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    // Ignore mostly-vertical gestures (page scroll)
    if (Math.abs(dx) < 72 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    if (dx > 0) void handleRating(4);
    else void handleRating(2);
  }, [touchGestures, isFlipped, handleRating]);

  if (!Array.isArray(cards) || cards.length === 0) return null;

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
      setSavedDeckId(deck.id);
      setSaveStatus({ type: 'success', message: 'Deck saved to your module successfully!' });
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: err.message || 'Error saving deck to database.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto my-6 font-sans">
      
      {/* 1. Dynamic Save / Info Header */}
      <div className="bg-card border border-border/80 rounded-xl p-4 shadow-sm dark:shadow-none space-y-3">
        {!hasSaved ? (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              value={deckTitle}
              onChange={(e) => setDeckTitle(e.target.value)}
              placeholder="Deck Title..."
              className="flex-1 w-full bg-background border border-border rounded-lg px-3.5 py-2 text-xs font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-400 uppercase tracking-wider font-mono"
            />

            <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[14rem]">
              <label className="text-[9px] font-mono font-bold uppercase text-muted-foreground">
                Save to Module: Select Folder…
              </label>
              <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-2 w-full">
                <Folder className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <select
                  value={selectedModuleCode}
                  onChange={(e) => setSelectedModuleCode(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-foreground focus:outline-none cursor-pointer w-full min-h-9"
                  aria-label="Save to Module"
                >
                  <option value="" className="bg-background text-muted-foreground">Select Folder…</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.code} className="bg-background text-emerald-400 font-bold">
                      {moduleDisplayName(m)}
                    </option>
                  ))}
                </select>
              </div>
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
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-emerald-400 bg-emerald-500/10 rounded border border-emerald-500/20 shrink-0">
                {selectedModuleCode || 'General'}
              </span>
              <InlineEditableTitle
                value={deckTitle}
                onSave={handleRename}
                className="text-sm font-bold text-foreground uppercase tracking-wide truncate max-w-xs"
                placeholder="Untitled Deck"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> SAVED
              </span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOverflowOpen((v) => !v)}
                  className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg border fios-border text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] cursor-pointer bg-[var(--fios-surface-2)]"
                  aria-label="More actions"
                  aria-expanded={overflowOpen}
                  title="More"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {overflowOpen && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-40 cursor-default"
                      aria-label="Dismiss menu"
                      onClick={() => setOverflowOpen(false)}
                    />
                    <div
                      className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-xl border fios-border bg-[var(--fios-surface)] shadow-lg py-1"
                      role="menu"
                    >
                      <div className="px-1 py-0.5" onClick={() => setOverflowOpen(false)}>
                        <AnkiExportButton
                          title={deckTitle}
                          deckId={savedDeckId}
                          cards={cards as any}
                          className="w-full justify-start border-0 rounded-lg px-3 py-2.5 min-h-[44px] text-[var(--fios-text)] hover:bg-[var(--fios-surface-2)]"
                        />
                      </div>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          handleExportJson();
                          setOverflowOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-left text-xs font-bold uppercase text-[var(--fios-text)] hover:bg-[var(--fios-surface-2)] cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Export JSON
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          void handleCopyShareCode();
                          setOverflowOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-left text-xs font-bold uppercase text-[var(--fios-text)] hover:bg-[var(--fios-surface-2)] cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Share code
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setShareOpen(true);
                          setOverflowOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-left text-xs font-bold uppercase text-[var(--fios-text)] hover:bg-[var(--fios-surface-2)] cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Share to friends
                      </button>
                      {savedDeckId && (
                        <div className="px-1 py-0.5 border-t fios-border" onClick={() => setOverflowOpen(false)}>
                          <ReportContentButton
                            targetType="deck"
                            targetId={savedDeckId}
                            targetLabel={deckTitle}
                            compact={false}
                            className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-left text-xs font-bold uppercase text-[var(--fios-text-muted)] hover:text-amber-400 hover:bg-[var(--fios-surface-2)] cursor-pointer rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {!hasSaved && (
          <div className="flex items-center gap-2 justify-end -mt-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => setOverflowOpen((v) => !v)}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-lg border fios-border text-[10px] font-mono font-bold uppercase text-[var(--fios-text-muted)] hover:text-[var(--fios-text)] cursor-pointer bg-[var(--fios-surface-2)]"
                aria-label="More export actions"
                aria-expanded={overflowOpen}
              >
                <MoreHorizontal className="w-4 h-4" /> More
              </button>
              {overflowOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40 cursor-default"
                    aria-label="Dismiss menu"
                    onClick={() => setOverflowOpen(false)}
                  />
                  <div
                    className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-xl border fios-border bg-[var(--fios-surface)] shadow-lg py-1"
                    role="menu"
                  >
                    <div className="px-1 py-0.5" onClick={() => setOverflowOpen(false)}>
                      <AnkiExportButton
                        title={deckTitle}
                        cards={cards as any}
                        className="w-full justify-start border-0 rounded-lg px-3 py-2.5 min-h-[44px] text-[var(--fios-text)] hover:bg-[var(--fios-surface-2)]"
                      />
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        handleExportJson();
                        setOverflowOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-left text-xs font-bold uppercase text-[var(--fios-text)] hover:bg-[var(--fios-surface-2)] cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Export JSON
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        void handleCopyShareCode();
                        setOverflowOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-left text-xs font-bold uppercase text-[var(--fios-text)] hover:bg-[var(--fios-surface-2)] cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Share code
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShareOpen(true);
                        setOverflowOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-left text-xs font-bold uppercase text-[var(--fios-text)] hover:bg-[var(--fios-surface-2)] cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Friends
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Study Filter & Mode Controls — equal-width segmented rows (no empty left gap) */}
        <div className="flex flex-col sm:flex-row items-stretch justify-between pt-2 border-t border-border/60 gap-3">
          <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border w-full sm:flex-1 min-w-0">
            <button
              onClick={() => { setStudyFilter('due'); setCurrentIndex(0); }}
              className={`flex-1 min-w-0 px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                studyFilter === 'due'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 font-black'
                  : 'text-muted-foreground hover:text-foreground border border-transparent'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" /> Due Today ({dueCards.length})
            </button>
            <button
              onClick={() => { setStudyFilter('all'); setCurrentIndex(0); }}
              className={`flex-1 min-w-0 px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                studyFilter === 'all'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 font-black'
                  : 'text-muted-foreground hover:text-foreground border border-transparent'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" /> All ({cards.length})
            </button>
          </div>

          <div className="flex items-center gap-1 w-full sm:flex-1 min-w-0">
            <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border flex-1 min-w-0">
              <button
                onClick={() => setMode('browse')}
                title="Browse: flip freely. Grading still updates your SM-2 schedule when you rate after reveal."
                className={`flex-1 min-w-0 px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'browse'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 font-black'
                    : 'text-muted-foreground hover:text-foreground border border-transparent'
                }`}
              >
                <Eye className="w-3.5 h-3.5 shrink-0" /> Browse
              </button>
              <button
                onClick={() => setMode('test')}
                title="Active Recall: answer stays hidden until you tap Reveal, then self-grade."
                className={`flex-1 min-w-0 px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'test'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 font-black'
                    : 'text-muted-foreground hover:text-foreground border border-transparent'
                }`}
              >
                <Target className="w-3.5 h-3.5 shrink-0" /> Recall
              </button>
            </div>
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setModeInfoOpen((v) => !v)}
                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg border fios-border text-[var(--fios-text-muted)] hover:accent-solid-text cursor-pointer bg-[var(--fios-surface-2)]"
                aria-label="Browse and Recall mode info"
                aria-expanded={modeInfoOpen}
                title="Mode info"
              >
                <Info className="w-4 h-4" />
              </button>
              {modeInfoOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40 cursor-default"
                    aria-label="Dismiss mode info"
                    onClick={() => setModeInfoOpen(false)}
                  />
                  <div
                    className="absolute right-0 sm:left-0 sm:right-auto top-full mt-1 z-50 w-[min(100vw-2rem,280px)] rounded-xl border fios-border bg-[var(--fios-surface)] shadow-lg p-3 text-[10px] font-mono text-[var(--fios-text-muted)] leading-relaxed"
                    role="dialog"
                    aria-label="Browse and Recall explanation"
                  >
                    <p>
                      <strong className="text-[var(--fios-text)]">Browse</strong> = flip when ready (answer hidden until flip).{' '}
                      <strong className="text-[var(--fios-text)]">Recall</strong> = quiz with explicit Reveal. Again/Hard/Good/Easy grades schedule the next review — Hard no longer resets your streak.
                    </p>
                  </div>
                </>
              )}
            </div>
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
        <div className="text-center py-12 space-y-3 bg-card border border-border rounded-xl p-6 shadow-sm dark:shadow-none">
          <h3 className="text-base font-bold text-foreground uppercase">All caught up! 🎉</h3>
          <p className="text-xs text-muted-foreground">No flashcards are due for review today according to your SM-2 schedule.</p>
          <button 
            onClick={() => setStudyFilter('all')}
            className="px-4 py-2 bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
          >
            Study All Cards Anyway
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-muted-foreground bg-card px-4 py-2.5 rounded-lg border border-border/80 font-mono">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
              CARD <span className="text-foreground">{currentIndex + 1}</span> / {activeCards.length}
            </span>
            <div className="w-36 h-2 bg-secondary rounded-full overflow-hidden p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-[var(--fios-accent-from)] via-[var(--fios-accent-via)] to-[var(--fios-accent-to)] rounded-full transition-all duration-300" 
                style={{ width: `${((currentIndex + 1) / activeCards.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Flashcard Tile — touch/mobile: swipe right=Easy, left=Hard when flipped. Desktop: tap only. */}
          <div
            onClick={isCodeCard && isFlipped ? undefined : handleToggleFlip}
            onTouchStart={touchGestures && !(isCodeCard && isFlipped) ? onTouchStart : undefined}
            onTouchEnd={touchGestures && !(isCodeCard && isFlipped) ? onTouchEnd : undefined}
            className={`${touchGestures ? 'fios-swipe-card' : ''} w-full min-h-[280px] bg-card rounded-xl p-6 flex flex-col justify-between text-center ${isCodeCard && isFlipped ? 'cursor-default' : 'cursor-pointer'} border border-border hover:border-emerald-400/50 shadow-sm dark:shadow-none transition-all duration-200 group relative overflow-hidden select-none active:scale-[0.99]`}
          >
            <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl ${isFlipped ? 'from-emerald-400/20' : 'from-cyan-400/20'} to-transparent rounded-tr-xl pointer-events-none`} />

            <div className="w-full flex justify-between items-center z-10 font-mono">
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded border ${
                isFlipped ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30' : 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30'
              }`}>
                {isFlipped ? (isCodeCard ? 'CODE LAB' : 'ANSWER') : 'QUESTION'}
              </span>
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
                {isCodeCard && isFlipped ? 'RUN BELOW' : 'TAP TO FLIP'}
              </span>
            </div>

            <div className="my-auto px-2 z-10 text-left sm:text-center w-full">
              {isFlipped && isCodeCard ? (
                <CodeCardRunner
                  language={(currentCard as any).code_language}
                  starterCode={(currentCard as any).starter_code || answerText}
                  expectedOutput={(currentCard as any).expected_output}
                  prompt={questionText}
                />
              ) : (
                <FormattedContent text={isFlipped ? answerText : questionText} />
              )}
            </div>

            <div className="w-full flex flex-wrap justify-center gap-2 z-10 font-mono pt-2">
              {hasSource && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSourceOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border fios-border text-[10px] font-bold uppercase text-[var(--fios-text)] cursor-pointer bg-[var(--fios-surface-2)]"
                >
                  <BookOpen className="w-3 h-3 accent-solid-text" /> View Source
                </button>
              )}
              {isFlipped && (
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setAiActionsOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] rounded-lg border fios-border text-[10px] font-bold uppercase text-[var(--fios-text)] cursor-pointer bg-[var(--fios-surface-2)]"
                    aria-expanded={aiActionsOpen}
                    aria-label="AI Actions"
                  >
                    <Sparkles className="w-3.5 h-3.5 accent-solid-text" /> AI Actions
                  </button>
                  {aiActionsOpen && (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-40 cursor-default"
                        aria-label="Dismiss AI actions"
                        onClick={() => setAiActionsOpen(false)}
                      />
                      <div
                        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-50 min-w-[200px] rounded-xl border fios-border bg-[var(--fios-surface)] shadow-lg py-1"
                        role="menu"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setTutorOpen(true);
                            setAiActionsOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-left text-[10px] font-bold uppercase text-[var(--fios-text)] hover:bg-[var(--fios-surface-2)] cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5 accent-solid-text" /> Tutor Me
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMnemonicOpen(true);
                            setAiActionsOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-left text-[10px] font-bold uppercase text-[var(--fios-text)] hover:bg-[var(--fios-surface-2)] cursor-pointer"
                          aria-label="Mnemonic"
                          title="Memory palace mnemonic"
                        >
                          <Brain className="w-3.5 h-3.5 accent-solid-text" /> Mnemonic
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          disabled={studyBusy}
                          onClick={async () => {
                            setAiActionsOpen(false);
                            setStudyBusy(true);
                            try {
                              const r = await studyFeynman({
                                topic: questionText,
                                explanation: answerText,
                              });
                              setFeynmanHint(
                                r.studentReply || r.feedback || 'Keep teaching — probe the edge cases.'
                              );
                            } catch (err) {
                              toast(err instanceof Error ? err.message : 'Feynman failed', 'error');
                            } finally {
                              setStudyBusy(false);
                            }
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-left text-[10px] font-bold uppercase text-[var(--fios-text)] hover:bg-[var(--fios-surface-2)] cursor-pointer disabled:opacity-60"
                          title="Feynman / Protégé — teach a confused first-year"
                        >
                          Teach
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          disabled={studyBusy}
                          onClick={async () => {
                            setAiActionsOpen(false);
                            setStudyBusy(true);
                            try {
                              const r = await studyDualCode({
                                front: questionText,
                                back: answerText,
                              });
                              setDualHint(
                                [r.iconHint && `Icon: ${r.iconHint}`, r.audioScript]
                                  .filter(Boolean)
                                  .join(' · ')
                              );
                            } catch (err) {
                              toast(err instanceof Error ? err.message : 'Dual-code failed', 'error');
                            } finally {
                              setStudyBusy(false);
                            }
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-left text-[10px] font-bold uppercase text-[var(--fios-text)] hover:bg-[var(--fios-surface-2)] cursor-pointer disabled:opacity-60"
                          title="Dual-coding micro-asset"
                        >
                          Dual
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {!isFlipped && (
                <div
                  className="flex flex-col items-center gap-1.5 w-full justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[9px] font-mono uppercase text-muted-foreground">Confidence?</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono text-[var(--fios-text-muted)] shrink-0">Guessing</span>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setJolPredicted(n)}
                        className={`min-w-[44px] min-h-[44px] rounded-lg text-[10px] font-bold border cursor-pointer ${
                          jolPredicted === n
                            ? 'accent-bg text-slate-950 border-transparent'
                            : 'border-border text-muted-foreground bg-[var(--fios-surface-2)]'
                        }`}
                        title="Judgment of Learning — how sure are you before flipping?"
                        aria-label={`Confidence ${n} of 5`}
                      >
                        {n}
                      </button>
                    ))}
                    <span className="text-[9px] font-mono text-[var(--fios-text-muted)] shrink-0">Certain</span>
                  </div>
                </div>
              )}
            </div>
            {(elaborateHint || feynmanHint || dualHint) && (
              <div className="z-10 text-[10px] text-left space-y-1 px-1 pt-1 text-[var(--fios-text-muted)]">
                {elaborateHint && <p><span className="font-bold uppercase">Elaborate:</span> {elaborateHint}</p>}
                {feynmanHint && <p><span className="font-bold uppercase">Feynman:</span> {feynmanHint}</p>}
                {dualHint && <p><span className="font-bold uppercase">Dual:</span> {dualHint}</p>}
              </div>
            )}
          </div>

          {/* SM-2 Spaced Repetition Rating Buttons */}
          {isFlipped ? (
            <div className="space-y-2 relative">
              {showSm2Onboard && (
                <div
                  className="absolute inset-x-0 -top-2 bottom-0 z-20 rounded-xl bg-background/95 border border-emerald-500/40 p-3 flex flex-col items-center justify-center gap-2 text-center shadow-xl"
                  role="dialog"
                  aria-label="SM-2 rating tip"
                >
                  <p className="text-[11px] font-mono font-bold uppercase tracking-wider accent-solid-text">
                    How SM-2 grading works
                  </p>
                  <p className="text-[11px] text-foreground leading-relaxed max-w-sm">
                    After you reveal the answer, rate how well you recalled it.
                    <strong className="text-foreground"> Again</strong> resets the card,
                    <strong className="text-foreground"> Hard</strong> keeps progress with a short interval,
                    <strong className="text-foreground"> Good</strong> / <strong className="text-foreground">Easy</strong> schedule further out.
                  </p>
                  <button
                    type="button"
                    onClick={dismissSm2Onboard}
                    className="mt-1 px-4 py-1.5 accent-bg text-slate-950 text-[10px] font-black uppercase rounded-lg cursor-pointer"
                  >
                    Got it
                  </button>
                </div>
              )}
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground text-center flex items-center justify-center gap-1">
                How well did you know this?
                <span title="Grading chooses the next local-calendar due date. Again lapses; Hard keeps progress.">
                  <HelpCircle className="w-3 h-3" />
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 font-mono fios-rating-clearance">
                <button
                  type="button"
                  onClick={() => { dismissSm2Onboard(); handleRating(1); }}
                  className="min-h-12 py-3 bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  AGAIN<br /><span className="text-[10px] opacity-80">{ratingPreview[1]}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { dismissSm2Onboard(); handleRating(2); }}
                  className="min-h-12 py-3 bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  HARD<br /><span className="text-[10px] opacity-80">{ratingPreview[2]}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { dismissSm2Onboard(); handleRating(3); }}
                  className="min-h-12 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 active:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  GOOD<br /><span className="text-[10px] opacity-80">{ratingPreview[3]}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { dismissSm2Onboard(); handleRating(4); }}
                  className="min-h-12 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  EASY<br /><span className="text-[10px] opacity-80">{ratingPreview[4]}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 font-mono">
              <button
                onClick={handlePrev}
                className="py-3.5 bg-card hover:bg-secondary/80 border border-border text-foreground font-extrabold italic uppercase tracking-wider text-xs rounded-lg transition-colors cursor-pointer text-center active:scale-[0.98]"
              >
                ← PREVIOUS
              </button>

              <button
                onClick={handleNext}
                className="py-3.5 bg-card hover:bg-secondary/80 border border-border text-foreground font-extrabold italic uppercase tracking-wider text-xs rounded-lg transition-colors cursor-pointer text-center active:scale-[0.98]"
              >
                NEXT →
              </button>
            </div>
          )}
        </div>
      )}

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={deckTitle}
        resourceType="deck"
        resourceId={savedDeckId}
        moduleCode={selectedModuleCode || undefined}
        payload={{ cardCount: cards.length }}
      />
      {sourceOpen && currentCard && (
        <SourceViewer
          page={Number((currentCard as any).source_page) || 1}
          quote={(currentCard as any).source_quote}
          onClose={() => setSourceOpen(false)}
        />
      )}
      <SocraticTutorModal
        open={tutorOpen}
        onClose={() => setTutorOpen(false)}
        cardFront={questionText}
        cardBack={answerText}
      />
      <MnemonicModal
        open={mnemonicOpen}
        onClose={() => setMnemonicOpen(false)}
        cardFront={questionText}
        cardBack={answerText}
      />
    </div>
  );
};

export const FlashcardDeck = React.memo(FlashcardDeckInner);
export default FlashcardDeck;