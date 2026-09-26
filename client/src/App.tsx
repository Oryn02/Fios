import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './lib/supabase';
import { IS_DEMO, DEMO_SESSION } from './lib/demo';
import { AuthModal } from './components/AuthModal';
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
import { QuizExamView } from './components/QuizExamView';
import { CodeExamView } from './components/CodeExamView';
import { DocumentsView } from './components/DocumentsView';
import { GradePredictorView } from './components/GradePredictorView';
import { ATUCalendarView } from './components/ATUCalendarView';
import { PomodoroWidget } from './components/PomodoroWidget';
import { QuickActions } from './components/QuickActions';
import { GeminiGate } from './components/GeminiGate';
import { AiTutorView } from './components/AiTutorView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { CookieConsent } from './components/CookieConsent';
import { ProfileProvider } from './context/ProfileContext';
import { PomodoroProvider } from './context/PomodoroContext';
import { ThemeProvider } from './context/ThemeContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { AiAuthProvider } from './context/AiAuthContext';
import { startOfflineQueueListener } from './lib/offlineQueue';
import { useAiAuth } from './context/AiAuthContext';

interface SelectedDeck {
  cards: Flashcard[];
  title?: string;
  moduleCode?: string;
  isSaved?: boolean;
}

const IDLE_MS = 24 * 60 * 60 * 1000;

const Dashboard: React.FC = () => {
  const { requireAiAuth } = useAiAuth();
  const [activeTab, setActiveTab] = useState('overview');
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
    if (tab === 'flashcards') {
      setCards([]);
      setSelectedDeck(null);
    }
    setOpenTutorOnLoad(!!options?.openTutor);
    setActiveTab(tab);
  }, []);

  const handleGenerate = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!studyNotes.trim()) return;
    if (!requireAiAuth()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await generateFlashcards(studyNotes);
      const cardsList = Array.isArray(data) ? data : data?.cards || [];
      setCards(cardsList);
      setSelectedDeck({
        cards: cardsList,
        title: studyNotes.trim().slice(0, 35) + '…',
        isSaved: false,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to connect to server.');
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

  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={handleTabChange}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{ willChange: 'transform, opacity' }}
        >
          {activeTab === 'overview' && (
            <ErrorBoundary fallbackTitle="Overview widgets crashed">
              <OverviewTab onOpenFlashcards={handleOpenFlashcards} onNavigate={handleTabChange} />
            </ErrorBoundary>
          )}

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

          {activeTab === 'modules' && (
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
            />
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
          {activeTab === 'schedule' && <ScheduleTab />}
          {activeTab === 'settings' && <SettingsTab />}
          {activeTab === 'updates' && <UpdatesTab />}
        </motion.div>
      </AnimatePresence>

      <PomodoroWidget />
      <QuickActions
        onNavigate={handleTabChange}
        onOpenTutor={() => handleTabChange('tutor')}
      />
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
        Academic Suite · Study Lab · v2.2.0
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
      <div className="p-4 bg-rose-500/10 border-l-4 border-rose-500 rounded-r-lg text-rose-300 text-xs font-bold tracking-wide uppercase font-mono">
        Notice: {error}
      </div>
    )}
  </>
);

export function App() {
  const [session, setSession] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: 'signin' | 'signup' }>({
    isOpen: false,
    mode: 'signin',
  });

  useEffect(() => {
    document.title = 'Fios v2.2.0 — Your Academic Command Center';
  }, []);

  useEffect(() => startOfflineQueueListener(), []);

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

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
      } else if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        setSession(session);
      } else {
        setSession(session);
      }
      setCheckingAuth(false);
    });

    return () => {
      subscription.unsubscribe();
      window.clearInterval(idleTimer);
      events.forEach((e) => window.removeEventListener(e, bump));
    };
  }, []);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center accent-solid-text font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full accent-bg animate-ping" />
          Initializing Fios v2.2.0…
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <ToastProvider>
        <LandingPage onOpenAuth={(mode) => setAuthModal({ isOpen: true, mode })} />
        <AnimatePresence>
          {authModal.isOpen && (
            <AuthModal
              mode={authModal.mode}
              onClose={() => setAuthModal({ isOpen: false, mode: 'signin' })}
            />
          )}
        </AnimatePresence>
        <CookieConsent />
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
              </ToastProvider>
            </AiAuthProvider>
          </PomodoroProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </ProfileProvider>
  );
}

export default App;
