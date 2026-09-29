import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './lib/supabase';
import { IS_DEMO, DEMO_SESSION } from './lib/demo';
import { AuthModal } from './components/AuthModal';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { LandingPage } from './components/LandingPage';
import { generateFlashcards } from './services/api';
import { Flashcard } from './types/api';
import { FlashcardDeck } from './components/FlashcardDeck';
import { DashboardLayout } from './components/DashboardLayout';
import { OverviewTab } from './components/OverviewTab';
import { ModulesView } from './components/ModulesView';
import { FileUpload } from './components/FileUpload';
import { ScheduleTab } from './components/ScheduleTab';
import { SettingsTab } from './components/SettingsTab';
import { UpdatesTab } from './components/UpdatesTab';
import { FocusTimer } from './components/FocusTimer';
import { PomodoroWidget } from './components/PomodoroWidget';
import { QuickActions } from './components/QuickActions';
import { BrainDumpInbox } from './components/BrainDumpInbox';
import { GeminiGate } from './components/GeminiGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { CookieConsent } from './components/CookieConsent';
import { GeminiLatencyHint } from './components/GeminiLatencyHint';
import { friendlyGeminiError } from './lib/geminiUx';
import { ProfileProvider } from './context/ProfileContext';
import { PomodoroProvider } from './context/PomodoroContext';
import { ThemeProvider } from './context/ThemeContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { AiAuthProvider } from './context/AiAuthContext';
import { startOfflineQueueListener, onOfflineQueueOnline } from './lib/offlineQueue';
import { reconcileCalendarState } from './lib/calendarService';
import { useAiAuth } from './context/AiAuthContext';
import { lockLandingBrand } from './lib/landingBrand';
import { NetworkStatusBanner } from './components/NetworkStatusBanner';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';
import { bootstrapClassReminders } from './lib/pushNotifications';
import { getUserDecksWithCards } from './lib/deckService';
import { sanitizeDeckTitle } from './lib/sanitizeDeckTitle';
import { useKeyboardVisible } from './hooks/useKeyboardVisible';
import { isCardDue } from './lib/spacedRepetition';
import type { FlightNavigatePayload } from './components/RevisionFlightPlan';

/** Heavy study-suite routes — code-split so Overview / Timetable / Modules stay snappy. */
const QuizExamView = lazy(() =>
  import('./components/QuizExamView').then((m) => ({ default: m.QuizExamView }))
);
const CodeExamView = lazy(() =>
  import('./components/CodeExamView').then((m) => ({ default: m.CodeExamView }))
);
const DocumentsView = lazy(() =>
  import('./components/DocumentsView').then((m) => ({ default: m.DocumentsView }))
);
const GradePredictorView = lazy(() =>
  import('./components/GradePredictorView').then((m) => ({ default: m.GradePredictorView }))
);
const AiTutorView = lazy(() =>
  import('./components/AiTutorView').then((m) => ({ default: m.AiTutorView }))
);
const ATUCalendarView = lazy(() =>
  import('./components/ATUCalendarView').then((m) => ({ default: m.ATUCalendarView }))
);

const HOT_TABS = new Set(['overview', 'schedule', 'modules']);

function TabFallback() {
  return (
    <div className="py-16 flex items-center justify-center gap-2 text-xs font-mono text-slate-500">
      <span className="w-2 h-2 rounded-full accent-bg animate-ping" />
      Loading…
    </div>
  );
}

interface SelectedDeck {
  cards: Flashcard[];
  title?: string;
  moduleCode?: string;
  isSaved?: boolean;
}

const IDLE_MS = 24 * 60 * 60 * 1000;

const Dashboard: React.FC = () => {
  const { requireAiAuth } = useAiAuth();
  const keyboardVisible = useKeyboardVisible();
  const [activeTab, setActiveTab] = useState('overview');
  /** Keep Overview / Timetable / Modules mounted after first visit for instant return nav. */
  const [mountedHotTabs, setMountedHotTabs] = useState<Set<string>>(() => new Set(['overview']));
  const [studyNotes, setStudyNotes] = useState('');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<SelectedDeck | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [activeCodeExamId, setActiveCodeExamId] = useState<string | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [openTutorOnLoad, setOpenTutorOnLoad] = useState(false);

  const handleTabChange = useCallback((tab: string, options?: { openTutor?: boolean }) => {
    if (tab === 'flashcards' && !options) {
      // plain nav to flashcards tab — keep generator unless opening a deck
    }
    setOpenTutorOnLoad(!!options?.openTutor);
    setActiveTab(tab);
    if (HOT_TABS.has(tab)) {
      setMountedHotTabs((prev) => {
        if (prev.has(tab)) return prev;
        const next = new Set(prev);
        next.add(tab);
        return next;
      });
    }
  }, []);

  const handleSmartNavigate = useCallback((tab: string, payload?: FlightNavigatePayload) => {
    if (payload?.intent === 'review' && payload.deckCards?.length) {
      setCards(payload.deckCards);
      setSelectedDeck({
        cards: payload.deckCards,
        title: payload.deckTitle || 'Review Queue',
        moduleCode: payload.moduleCode || undefined,
        isSaved: true,
      });
      setActiveTab('flashcards');
      return;
    }
    if (payload?.quizId) {
      setActiveQuizId(payload.quizId);
      setActiveTab('quiz');
      return;
    }
    if (payload?.codeExamId) {
      setActiveCodeExamId(payload.codeExamId);
      setActiveTab('code');
      return;
    }
    if (tab === 'flashcards' && !payload?.deckCards?.length) {
      // "Make" / generate path — open Study Lab generator
      setCards([]);
      setSelectedDeck(null);
    }
    setActiveTab(tab);
    if (HOT_TABS.has(tab)) {
      setMountedHotTabs((prev) => {
        if (prev.has(tab)) return prev;
        const next = new Set(prev);
        next.add(tab);
        return next;
      });
    }
  }, []);

  const handleGenerate = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!studyNotes.trim()) return;
    if (!requireAiAuth()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await generateFlashcards(studyNotes);
      const cardsList = Array.isArray(data?.cards) ? data.cards : [];
      if (!cardsList.length) {
        throw new Error('No flashcards were returned. Try longer notes or regenerate.');
      }
      setCards(cardsList);
      setSelectedDeck({
        cards: cardsList,
        title: sanitizeDeckTitle(studyNotes.trim().slice(0, 48), 'Generated Flashcard Deck'),
        isSaved: false,
      });
    } catch (err: any) {
      const msg = err?.message || String(err) || 'Failed to connect to server.';
      setError(
        msg.includes('is not a function')
          ? 'Flashcard generation failed. Check your Gemini key in Settings and try again.'
          : friendlyGeminiError(msg)
      );
    } finally {
      setLoading(false);
    }
  }, [studyNotes, requireAiAuth]);

  const handleOpenFlashcards = useCallback((
    deckCards?: any[],
    title?: string,
    moduleCode?: string,
    isSaved = false
  ) => {
    if (deckCards && deckCards.length > 0) {
      setCards(deckCards);
      setSelectedDeck({ cards: deckCards, title, moduleCode, isSaved });
    } else {
      setCards([]);
      setSelectedDeck(null);
    }
    setActiveTab('flashcards');
  }, []);

  const handleOpenReviewQueue = useCallback(async () => {
    try {
      const decks = await getUserDecksWithCards();
      const due: any[] = [];
      for (const deck of decks || []) {
        for (const c of (deck as any).cards || []) {
          if (isCardDue(c.next_review)) due.push(c);
        }
      }
      if (due.length === 0) {
        setActiveTab('flashcards');
        setCards([]);
        setSelectedDeck(null);
        return;
      }
      setCards(due);
      setSelectedDeck({ cards: due, title: 'Review Queue', isSaved: true });
      setActiveTab('flashcards');
    } catch {
      setActiveTab('flashcards');
    }
  }, []);

  useEffect(() => {
    bootstrapClassReminders();
  }, []);

  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={handleTabChange}>
      <NetworkStatusBanner />

      {/* Hot surfaces stay mounted after first visit so Timetable / Modules / Tasks feel instant. */}
      {mountedHotTabs.has('overview') && (
        <div className={activeTab === 'overview' ? 'block' : 'hidden'} aria-hidden={activeTab !== 'overview'}>
          <ErrorBoundary fallbackTitle="Overview widgets crashed">
            <OverviewTab
              onOpenFlashcards={handleOpenFlashcards}
              onNavigate={handleSmartNavigate}
              onOpenReviewQueue={handleOpenReviewQueue}
              isActive={activeTab === 'overview'}
            />
          </ErrorBoundary>
        </div>
      )}
      {mountedHotTabs.has('schedule') && (
        <div className={activeTab === 'schedule' ? 'block' : 'hidden'} aria-hidden={activeTab !== 'schedule'}>
          <ScheduleTab />
        </div>
      )}
      {mountedHotTabs.has('modules') && (
        <div className={activeTab === 'modules' ? 'block' : 'hidden'} aria-hidden={activeTab !== 'modules'}>
          <ModulesView
            onOpenFlashcards={handleOpenFlashcards}
            onOpenQuiz={(quizId) => {
              setActiveQuizId(quizId);
              setActiveTab('quiz');
            }}
            onOpenCodeExam={(examId) => {
              setActiveCodeExamId(examId);
              setActiveTab('code');
            }}
            onOpenDocument={(docId) => {
              setActiveDocId(docId);
              setActiveTab('documents');
            }}
            setActiveTab={handleTabChange}
            isActive={activeTab === 'modules'}
          />
        </div>
      )}

      {!HOT_TABS.has(activeTab) && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            style={{ willChange: 'transform, opacity' }}
          >
            <Suspense fallback={<TabFallback />}>
              {activeTab === 'flashcards' && (
                <div className="space-y-8 max-w-4xl mx-auto">
                  {cards.length === 0 ? (
                    <FlashcardGenerator
                      studyNotes={studyNotes}
                      setStudyNotes={setStudyNotes}
                      onGenerate={handleGenerate}
                      loading={loading}
                      error={error}
                    />
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-[#0e131f] border border-slate-800 p-3 rounded-xl">
                        <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                          Active deck studying
                        </span>
                        <button
                          onClick={() => {
                            setCards([]);
                            setSelectedDeck(null);
                          }}
                          className="text-xs font-mono accent-solid-text hover:underline font-bold uppercase cursor-pointer"
                        >
                          + Generate New Deck
                        </button>
                      </div>
                      <ErrorBoundary fallbackTitle="Flashcard deck crashed">
                        <FlashcardDeck
                          cards={cards}
                          isSaved={selectedDeck?.isSaved ?? false}
                          deckTitle={selectedDeck?.title}
                          moduleCode={selectedDeck?.moduleCode}
                        />
                      </ErrorBoundary>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'quiz' && (
                <GeminiGate feature="Quiz Generator">
                  <QuizExamView initialQuizId={activeQuizId} />
                </GeminiGate>
              )}

              {activeTab === 'code' && (
                <GeminiGate feature="Code Exams">
                  <ErrorBoundary fallbackTitle="Code Lab crashed">
                    <CodeExamView initialExamId={activeCodeExamId} />
                  </ErrorBoundary>
                </GeminiGate>
              )}

              {activeTab === 'documents' && (
                <DocumentsView
                  initialDocId={activeDocId}
                  autoOpenTutor={openTutorOnLoad}
                />
              )}

              {activeTab === 'tutor' && <AiTutorView />}

              {activeTab === 'atu-calendar' && <ATUCalendarView />}

              {activeTab === 'grades' && <GradePredictorView />}
              {activeTab === 'timer' && (
                <div className="py-8">
                  <FocusTimer />
                </div>
              )}
              {activeTab === 'settings' && <SettingsTab />}
              {activeTab === 'updates' && <UpdatesTab />}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Shared bottom-right dock: Quick FAB (right) · Pomodoro · Brain Dump (left of duo).
          Row-reverse keeps FAB nearest the corner; clears bottom nav via CSS calc offset.
          Auto-hides when soft keyboard / text focus is active (mobile). */}
      <div
        className={`fios-fab-dock fixed right-3 md:right-6 flex flex-row-reverse items-end gap-2.5 md:gap-3 pointer-events-none transition-all duration-200 ${
          keyboardVisible ? 'fios-chrome-hidden' : ''
        }`}
        aria-label="Floating study tools"
        aria-hidden={keyboardVisible || undefined}
      >
        <QuickActions
          onNavigate={handleTabChange}
          onOpenTutor={() => handleTabChange('tutor')}
        />
        <PomodoroWidget />
        <BrainDumpInbox />
      </div>
    </DashboardLayout>
  );
};

const FlashcardGenerator: React.FC<{
  studyNotes: string;
  setStudyNotes: (v: string) => void;
  onGenerate: (e?: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
}> = ({ studyNotes, setStudyNotes, onGenerate, loading, error }) => (
  <>
    <header className="flex flex-col items-center text-center space-y-3 pt-2">
      <div className="flex items-center gap-2 px-3 py-1 rounded-sm bg-[var(--fios-surface-2)] border-l-2 accent-border accent-solid-text text-[11px] font-black uppercase tracking-widest">
        <span className="w-1.5 h-1.5 rounded-full accent-bg animate-pulse" />
        Academic Suite · Study Lab · v3.7.4
      </div>
      <h1 className="text-4xl sm:text-5xl font-black italic tracking-tight text-white uppercase">
        Fios <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--fios-accent-from)] via-[var(--fios-accent-via)] to-[var(--fios-accent-to)]">Studio</span>
      </h1>
      <p className="text-slate-400 text-xs sm:text-sm font-medium max-w-md">
        Convert lecture slides and study notes into high-contrast flashcards instantly.
      </p>
    </header>

    <form
      onSubmit={onGenerate}
      className="bg-[#0e131f]/95 backdrop-blur-xl border border-slate-800/80 rounded-xl p-6 shadow-2xl space-y-4 relative overflow-hidden font-sans"
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--fios-accent-solid)] to-transparent" />
      <div className="flex items-center justify-between">
        <label className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
          <span className="w-1 h-3 accent-bg rounded-xs" />
          Source Material
        </label>
        <span className="text-[11px] font-mono text-slate-500">{studyNotes.length} CHARS</span>
      </div>

      <FileUpload onTextExtracted={(extractedText) => setStudyNotes(extractedText)} />

      <textarea
        value={studyNotes}
        onChange={(e) => setStudyNotes(e.target.value)}
        placeholder="Paste your course notes or lecture slides here…"
        className="w-full h-44 p-4 bg-[#07090e]/90 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:accent-border focus:ring-1 focus:ring-[var(--fios-accent-solid)] resize-none font-mono text-xs sm:text-sm transition-all"
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading || !studyNotes.trim()}
          className="flex-1 py-3.5 accent-bg hover:opacity-90 text-slate-950 font-black italic uppercase tracking-wider text-sm rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              Generating Deck…
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

    {error && (
      <div className="space-y-2">
        <div className="p-4 bg-rose-500/10 border-l-4 border-rose-500 rounded-r-lg text-rose-300 text-xs font-bold tracking-wide uppercase font-mono">
          Notice: {error}
        </div>
        <GeminiLatencyHint error={error} />
      </div>
    )}
    <GeminiLatencyHint busy={loading} />
  </>
);

function isResetPasswordPath(): boolean {
  try {
    return window.location.pathname.replace(/\/+$/, '') === '/reset-password';
  } catch {
    return false;
  }
}

/** Supabase recovery links put `type=recovery` (and sometimes `error`) in the hash or query. */
function readAuthRedirectParams(): { type: string | null; error: string | null } {
  try {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(window.location.search.replace(/^\?/, ''));
    const type = hash.get('type') || query.get('type');
    const error =
      hash.get('error_description') ||
      hash.get('error') ||
      query.get('error_description') ||
      query.get('error');
    return { type, error };
  } catch {
    return { type: null, error: null };
  }
}

/** Only recovery redirects (path and/or type=recovery) own URL auth errors — not GitHub OAuth failures. */
function isRecoveryAuthFailure(redirect: { type: string | null; error: string | null }): boolean {
  return !!redirect.error && (isResetPasswordPath() || redirect.type === 'recovery');
}

/** Drop auth error params from the URL so a refresh does not re-trigger handling. */
function clearAuthErrorFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    url.searchParams.delete('error_code');
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    if (hashParams.has('error') || hashParams.has('error_description') || hashParams.has('error_code')) {
      hashParams.delete('error');
      hashParams.delete('error_description');
      hashParams.delete('error_code');
      const nextHash = hashParams.toString();
      url.hash = nextHash ? `#${nextHash}` : '';
    }
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {
    /* ignore */
  }
}

export function App() {
  const [session, setSession] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  /** Show `/reset-password` shell (path or recovery event) — not proof of a recovery session. */
  const [passwordRecovery, setPasswordRecovery] = useState(() => isResetPasswordPath());
  /** True only after Supabase emits `PASSWORD_RECOVERY` (genuine reset link). */
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recoveryInvalid, setRecoveryInvalid] = useState(() =>
    isRecoveryAuthFailure(readAuthRedirectParams()),
  );
  const recoveryReadyRef = useRef(false);
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    mode: 'signin' | 'signup';
    panel?: 'auth' | 'forgot-password' | 'forgot-email';
    initialError?: string | null;
  }>({
    isOpen: false,
    mode: 'signin',
  });

  useEffect(() => {
    document.title = 'Fios v3.7.4 — Your Academic Command Center';
  }, []);

  useEffect(() => {
    const stopQueue = startOfflineQueueListener();
    const stopCal = onOfflineQueueOnline(() => {
      void reconcileCalendarState();
    });
    return () => {
      stopQueue();
      stopCal();
    };
  }, []);

  // Logged-out marketing surface: force default emerald + dark (ignore Settings prefs)
  useEffect(() => {
    if (checkingAuth || session || passwordRecovery) return;
    return lockLandingBrand();
  }, [checkingAuth, session, passwordRecovery]);

  useEffect(() => {
    if (IS_DEMO) {
      setSession(DEMO_SESSION as any);
      setCheckingAuth(false);
      return;
    }

    let lastActive = Date.now();
    const bump = () => { lastActive = Date.now(); };
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    const idleTimer = window.setInterval(() => {
      if (Date.now() - lastActive > IDLE_MS) {
        void supabase.auth.signOut();
      }
    }, 60_000);

    const redirect = readAuthRedirectParams();
    if (isRecoveryAuthFailure(redirect)) {
      setRecoveryInvalid(true);
      setPasswordRecovery(true);
    } else if (redirect.type === 'recovery') {
      setPasswordRecovery(true);
    } else if (redirect.error) {
      // OAuth / non-recovery auth errors: show AuthModal, do not hijack into reset UI.
      const message = decodeURIComponent(redirect.error.replace(/\+/g, ' '));
      clearAuthErrorFromUrl();
      setAuthModal({ isOpen: true, mode: 'signin', panel: 'auth', initialError: message });
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCheckingAuth(false);
    }).catch(() => {
      setSession(null);
      setCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryReadyRef.current = true;
        setPasswordRecovery(true);
        setRecoveryReady(true);
        setRecoveryInvalid(false);
      }
      if (event === 'SIGNED_OUT') {
        setSession(null);
        if (!isResetPasswordPath()) {
          setPasswordRecovery(false);
          setRecoveryReady(false);
          recoveryReadyRef.current = false;
          setRecoveryInvalid(false);
        }
      } else if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        setSession(nextSession);
      } else {
        setSession(nextSession);
      }
      setCheckingAuth(false);
    });

    return () => {
      subscription.unsubscribe();
      window.clearInterval(idleTimer);
      events.forEach((e) => window.removeEventListener(e, bump));
    };
  }, []);

  // After auth settles: path alone or a normal session must not unlock the form.
  // Brief grace so PASSWORD_RECOVERY can fire after getSession resolves.
  useEffect(() => {
    if (checkingAuth || !passwordRecovery || recoveryReady || recoveryInvalid) return;
    const graceMs = readAuthRedirectParams().type === 'recovery' ? 2500 : 800;
    const id = window.setTimeout(() => {
      if (!recoveryReadyRef.current) setRecoveryInvalid(true);
    }, graceMs);
    return () => window.clearTimeout(id);
  }, [checkingAuth, passwordRecovery, recoveryReady, recoveryInvalid]);

  const clearRecoveryUi = useCallback(() => {
    setPasswordRecovery(false);
    setRecoveryReady(false);
    recoveryReadyRef.current = false;
    setRecoveryInvalid(false);
    try {
      window.history.replaceState({}, '', '/');
    } catch {
      /* ignore */
    }
  }, []);

  const finishPasswordRecovery = useCallback(() => {
    clearRecoveryUi();
  }, [clearRecoveryUi]);

  /**
   * From invalid reset UI: clear leftover session before leaving recovery shell.
   * Opening AuthModal first (while session is still set) mounts Dashboard, which never
   * renders AuthModal — await signOut / local clear first, then show forgot-password.
   */
  const requestNewResetLink = useCallback(async () => {
    // Stay on recovery UI until session is gone so Dashboard never flashes.
    setSession(null);
    try {
      await supabase.auth.signOut();
    } catch {
      /* local session already cleared */
    }
    clearRecoveryUi();
    setAuthModal({ isOpen: true, mode: 'signin', panel: 'forgot-password', initialError: null });
  }, [clearRecoveryUi]);

  const closeAuthModal = useCallback(() => {
    setAuthModal({ isOpen: false, mode: 'signin', initialError: null });
  }, []);

  const recoveryStatus: 'waiting' | 'ready' | 'invalid' = recoveryReady
    ? 'ready'
    : recoveryInvalid
      ? 'invalid'
      : 'waiting';

  if (checkingAuth && !passwordRecovery) {
    return (
      <div className="min-h-dvh fios-app-bg flex items-center justify-center accent-solid-text font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full accent-bg animate-ping" />
          Initializing Fios v3.7.4…
        </div>
      </div>
    );
  }

  if (passwordRecovery) {
    return (
      <ToastProvider>
        <div data-landing data-theme="dark">
          <ResetPasswordPage
            status={recoveryStatus}
            onDone={finishPasswordRecovery}
            onBackToApp={clearRecoveryUi}
            onRequestNewLink={requestNewResetLink}
          />
          <AnimatePresence>
            {authModal.isOpen && (
              <AuthModal
                mode={authModal.mode}
                initialPanel={authModal.panel || 'auth'}
                initialError={authModal.initialError}
                onClose={closeAuthModal}
              />
            )}
          </AnimatePresence>
          <CookieConsent />
          <PwaUpdatePrompt />
        </div>
      </ToastProvider>
    );
  }

  if (!session) {
    return (
      <ToastProvider>
        <div data-landing data-theme="dark">
          <LandingPage onOpenAuth={(mode) => setAuthModal({ isOpen: true, mode })} />
          <AnimatePresence>
            {authModal.isOpen && (
              <AuthModal
                mode={authModal.mode}
                initialPanel={authModal.panel || 'auth'}
                initialError={authModal.initialError}
                onClose={closeAuthModal}
              />
            )}
          </AnimatePresence>
          <CookieConsent />
          <PwaUpdatePrompt />
        </div>
      </ToastProvider>
    );
  }

  return (
    <ProfileProvider>
      <ThemeProvider>
        <PreferencesProvider>
          <PomodoroProvider>
            <AiAuthProvider>
              <ToastProvider>
                <Dashboard />
                <CookieConsent />
                <PwaUpdatePrompt />
              </ToastProvider>
            </AiAuthProvider>
          </PomodoroProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </ProfileProvider>
  );
}

export default App;
