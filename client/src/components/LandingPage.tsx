import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, Layers, HelpCircle, Code2, FileText, Target, Timer,
  ShieldCheck, KeyRound, Play, Check, ChevronDown, Mail, Calendar,
  Bot, BookOpen, Smartphone, Palette, Sparkles,
} from 'lucide-react';
import { FiosLogo } from './FiosLogo';
import { enableDemoAndReload } from '../lib/demo';
import { PrivacyModal } from './PrivacyModal';
import { TermsModal } from './TermsModal';
import { SupportModal } from './SupportModal';

interface LandingPageProps {
  onOpenAuth: (mode: 'signin' | 'signup') => void;
}

const features = [
  {
    icon: Calendar,
    title: 'Schedule & unified agenda',
    body: 'Sync any college iCal feed or build a manual timetable. Classes and timed tasks interleave on one agenda with Next Up and finished-class mute.',
  },
  {
    icon: Layers,
    title: 'SM-2 flashcards',
    body: 'AI decks scheduled with corrected Hard/Easy intervals, local-day due dates, and touch swipe Easy/Hard on mobile.',
  },
  {
    icon: Bot,
    title: 'AI Tutor',
    body: 'Full-screen chat grounded in your notes when you want RAG. Bring your own Gemini key — your quota, your data.',
  },
  {
    icon: FileText,
    title: 'Smart Notes',
    body: 'Upload PDFs and lecture text for summaries, glossaries, revision history, and Ask AI from the same hub.',
  },
  {
    icon: Code2,
    title: 'Code Lab',
    body: 'Monaco-powered bug-fix, output prediction, and logic challenges with optional custom prompts and AI grading.',
  },
  {
    icon: HelpCircle,
    title: 'Exam Mode & Active Recall',
    body: 'MCQ practice exams with explanations, plus blurting-style recall with Reveal-before-grade and accuracy reports.',
  },
  {
    icon: BookOpen,
    title: 'Study hubs & modules',
    body: 'Overview flight plan, readiness heatmap, grade predictor, focus timer, and module folders — customize what sits in your nav.',
  },
  {
    icon: Palette,
    title: 'Themes & accents',
    body: 'Dark, Light, or System with emerald-teal accents (and more), Low-Power mode, Zen focus, and OpenDyslexic.',
  },
  {
    icon: Smartphone,
    title: 'Installable PWA',
    body: 'Add Fios to your home screen. Offline mutation queue covers common writes until you reconnect.',
  },
];

const walkthrough = [
  {
    id: 'flashcards',
    label: 'Notes → Flashcards',
    lines: [
      '# Paste lecture notes',
      'Photosynthesis converts light…',
      '',
      '→ 8 SM-2 flashcards generated',
      'Q: Where does it occur?',
      'A: In the chloroplasts.',
    ],
  },
  {
    id: 'agenda',
    label: 'Timetable → Agenda',
    lines: [
      '# Sync iCal or add manual classes',
      'COMP5012 · Lab · 10:00–12:00',
      'Task · Pointers exercise · due 14:00',
      '',
      '→ Unified agenda (classes + tasks)',
      '✓ Next Up highlighted · finished muted',
    ],
  },
  {
    id: 'tutor',
    label: 'Notes → AI Tutor',
    lines: [
      '# Open Tutor with your Gemini key',
      'Ask: Explain recursion with a stack trace…',
      '',
      '→ Optional RAG from uploaded chunks',
      '✓ Grounded answer in your lecture notes',
    ],
  },
];

const faqs = [
  {
    q: 'Is Fios completely free to use?',
    a: 'Yes. Fios is free for personal academic use. Sign up, manage modules, run focus sessions, and study with flashcards at no cost. AI features use your own free Google Gemini API key (BYO-Key).',
  },
  {
    q: 'How do I create an account?',
    a: 'Open Fios and choose Sign up. Register with email/password through Supabase Auth, or continue with GitHub OAuth when enabled. After sign-in you land in the dashboard ready for modules and notes.',
  },
  {
    q: 'How does Bring Your Own Key (BYO-Key) work?',
    a: 'Paste your free Google Gemini API key in Settings. It is stored on your profile under RLS and sent only with your own requests. Test, replace, or remove it anytime.',
  },
  {
    q: 'How do I sync my college timetable (iCal)?',
    a: 'In Schedule or Settings, paste an HTTPS iCal feed URL and save. Fios fetches it through the API proxy so the browser never hits CORS-blocked campus hosts. Events appear on Overview and calendar views after a successful sync.',
  },
  {
    q: 'What are the core study hubs?',
    a: 'Overview (flight plan, heatmap, tasks, agenda), Flashcards (SM-2), Modules, Exam Mode (MCQ), Code Lab, Smart Notes, AI Tutor, Grades, Focus Timer / Pomodoro, Schedule / ATU Calendar, plus Settings and Updates. Customize mobile bottom nav and desktop sidebar order in Settings.',
  },
  {
    q: 'Are my notes private? (GDPR)',
    a: 'Study data lives in your private Supabase schema with Row Level Security. See Privacy Policy and Terms in the footer — and Export My Data in Settings after sign-in.',
  },
  {
    q: 'Can I install Fios as an app (PWA)?',
    a: 'Yes. Use Install in Settings or your browser’s “Add to Home Screen”. Offline mutation queue covers common writes when you reconnect.',
  },
];

const techBadges = ['React 19', 'TypeScript', 'Tailwind CSS', 'Supabase', 'Gemini API', 'Framer Motion', 'PWA'];

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState('flashcards');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const activeWalk = walkthrough.find((w) => w.id === tab) || walkthrough[0];

  useEffect(() => {
    const open = () => setShowPrivacy(true);
    window.addEventListener('fios-open-privacy', open);
    return () => window.removeEventListener('fios-open-privacy', open);
  }, []);

  const fadeUp = reduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 } };

  return (
    <div data-theme="dark" className="min-h-dvh bg-black text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-black overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(20,184,166,0.12),_transparent_50%)]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.35) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
          }}
        />
      </div>

      <header className="w-full border-b border-white/10 bg-black/60 backdrop-blur-md sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
          <FiosLogo size="md" fixedEmerald />
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => onOpenAuth('signin')} className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2 cursor-pointer">
              Sign in
            </button>
            <motion.button
              whileHover={reduceMotion ? undefined : { scale: 1.04 }}
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-semibold text-sm px-4 py-2 rounded-lg shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              Get Started Free
            </motion.button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full relative z-10">
        {/* Hero — brand, one headline, one sentence, CTAs, one dominant visual */}
        <section className="relative min-h-[min(92dvh,900px)] flex flex-col justify-end overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/40 via-black/40 to-black pointer-events-none" />
          <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-10 w-full space-y-6 text-center sm:text-left">
            <motion.div {...fadeUp} transition={{ duration: 0.45 }} className="flex justify-center sm:justify-start">
              <FiosLogo size="xl" fixedEmerald />
            </motion.div>

            <motion.h1
              {...fadeUp}
              transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.08 }}
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05] max-w-3xl"
            >
              Your academic command center —{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                notes to mastery.
              </span>
            </motion.h1>

            <motion.p
              {...fadeUp}
              transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.14 }}
              className="text-slate-400 text-base md:text-lg leading-relaxed max-w-xl mx-auto sm:mx-0"
            >
              Turn lectures into SM-2 flashcards, exams, Code Lab challenges, and an AI tutor — with schedule, agenda, and focus tools in one place.
            </motion.p>

            <motion.div
              {...fadeUp}
              transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.2 }}
              className="flex flex-wrap items-center justify-center sm:justify-start gap-3"
            >
              <motion.button
                whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-bold px-6 py-3.5 rounded-xl flex items-center gap-2 shadow-xl shadow-emerald-500/25 text-base cursor-pointer"
              >
                Get Started Free <ArrowRight className="w-5 h-5" />
              </motion.button>
              <button
                type="button"
                onClick={enableDemoAndReload}
                className="border border-white/15 hover:border-emerald-400/50 bg-white/5 hover:bg-white/10 text-slate-100 font-semibold px-6 py-3.5 rounded-xl text-base cursor-pointer flex items-center gap-2"
              >
                <Play className="w-4 h-4" /> Explore Live Demo
              </button>
            </motion.div>
          </div>

          <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.22, duration: 0.55 }}
            className="relative w-full border-t border-white/10 bg-gradient-to-b from-white/[0.04] to-black"
          >
            <div className="max-w-6xl mx-auto px-0 sm:px-6">
              <div className="sm:rounded-t-2xl border-x-0 sm:border-x border-t border-white/10 bg-[#07090e]/90 overflow-hidden shadow-[0_-20px_60px_-30px_rgba(16,185,129,0.35)]">
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                  <span className="ml-3 text-[11px] font-mono text-slate-500">fios · overview · agenda · tutor</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 text-left">
                  {[
                    { t: 'Unified agenda', s: 'Classes + timed tasks' },
                    { t: 'SM-2 Flashcards', s: 'Due today · swipe review' },
                    { t: 'AI Tutor', s: 'Ask your notes' },
                    { t: 'Code Lab', s: 'Bug-fix · Monaco' },
                  ].map((c) => (
                    <div key={c.t} className="bg-black/70 p-4 sm:p-5 min-h-[5.5rem]">
                      <p className="text-xs sm:text-sm font-bold text-white truncate">{c.t}</p>
                      <p className="text-[10px] sm:text-[11px] font-mono text-emerald-400 mt-1">{c.s}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <div className="max-w-6xl mx-auto px-6">
          <section className="py-16 space-y-8">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest inline-flex items-center gap-2 justify-center">
                <Sparkles className="w-3.5 h-3.5" /> Study hubs
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white">Everything connected for the semester.</h2>
              <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto">
                Schedule, notes, recall, exams, and focus — one dashboard with privacy-first BYO Gemini.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={f.title}
                    initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.35, delay: reduceMotion ? 0 : Math.min(i * 0.04, 0.24) }}
                    className="py-2 space-y-3 border-t border-white/10 pt-5"
                  >
                    <div className="text-emerald-400 w-fit"><Icon className="w-6 h-6" /></div>
                    <h3 className="text-lg font-bold text-white">{f.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{f.body}</p>
                  </motion.div>
                );
              })}
            </div>
          </section>

          <section className="py-12 space-y-6">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">See it in action</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white">From raw notes to a living study plan.</h2>
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {walkthrough.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setTab(w.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer ${
                    tab === w.id
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950'
                      : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-black/60 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/10 text-[11px] font-mono text-slate-500">fios · transform</div>
              <AnimatePresence mode="wait">
                <motion.pre
                  key={activeWalk.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="p-5 text-xs font-mono leading-relaxed text-slate-300 whitespace-pre-wrap"
                >
                  {activeWalk.lines.map((l, i) => (
                    <div
                      key={i}
                      className={l.startsWith('→') ? 'text-emerald-400 font-bold' : l.startsWith('✓') ? 'text-emerald-300' : ''}
                    >
                      {l || '\u00A0'}
                    </div>
                  ))}
                </motion.pre>
              </AnimatePresence>
            </div>
          </section>

          <section className="py-14">
            <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 to-black p-8 md:p-12 grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest">
                  <ShieldCheck className="w-4 h-4" /> Privacy-first
                </div>
                <h2 className="text-3xl font-bold text-white">Bring your own Gemini key.</h2>
                <p className="text-slate-400 leading-relaxed">
                  Fios never resells AI access. Your key stays scoped to your account and powers quizzes, Code Lab, summaries, and the tutor — with Privacy Policy and Terms always a click away.
                </p>
                <ul className="space-y-2 text-sm text-slate-300">
                  {['Your key, your quota, your data', 'Stored on your profile — never shared', 'Unlock quizzes, code exams & the AI tutor'].map((t) => (
                    <li key={t} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <KeyRound className="w-5 h-5" /> <span className="text-sm font-bold text-white">Gemini API Key</span>
                </div>
                <div className="bg-black/60 border border-white/10 rounded-lg px-3 py-2.5 font-mono text-xs text-slate-500">AIza••••••••••••••••••••</div>
                <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Key validated · AI features unlocked
                </div>
              </div>
            </div>
          </section>

          <section className="py-14 max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Questions</span>
              <h2 className="text-3xl font-bold text-white">FAQ</h2>
            </div>
            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={faq.q} className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-4 text-left flex items-center justify-between gap-4 font-bold text-sm text-white hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180 text-emerald-400' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="py-14 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">Your next semester starts in Fios.</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Free to configure with Supabase persistence across devices — install as a PWA when you are ready.</p>
            <motion.button
              whileHover={reduceMotion ? undefined : { scale: 1.04 }}
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-bold px-8 py-3.5 rounded-xl shadow-xl shadow-emerald-500/20 text-base cursor-pointer"
            >
              Get Started Free
            </motion.button>
          </section>
        </div>
      </main>

      <footer className="w-full border-t border-white/10 py-8 relative z-10">
        <div className="max-w-6xl mx-auto px-6 space-y-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <FiosLogo size="sm" fixedEmerald />
            <div className="flex items-center gap-5 text-xs text-slate-400 flex-wrap justify-center">
              <button type="button" onClick={() => onOpenAuth('signin')} className="hover:text-white cursor-pointer">Sign in</button>
              <button type="button" onClick={() => onOpenAuth('signup')} className="hover:text-white cursor-pointer">Sign up</button>
              <button type="button" onClick={enableDemoAndReload} className="hover:text-white cursor-pointer">Live demo</button>
              <button type="button" onClick={() => setShowPrivacy(true)} className="hover:text-emerald-400 cursor-pointer underline">Privacy Policy</button>
              <button type="button" onClick={() => setShowTerms(true)} className="hover:text-emerald-400 cursor-pointer underline">Terms of Service</button>
              <button type="button" onClick={() => setShowSupport(true)} className="hover:text-emerald-400 transition-colors inline-flex items-center gap-1 cursor-pointer">
                <Mail className="w-3.5 h-3.5" /> Support
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {techBadges.map((b) => (
              <span key={b} className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono text-slate-400">{b}</span>
            ))}
          </div>
          <p className="text-[11px] text-slate-600">Fios v2.2.5 · Built as an AI test app with Google Gemini & Cursor Agent Mode.</p>
        </div>
      </footer>

      {showPrivacy && <PrivacyModal variant="landing" onClose={() => setShowPrivacy(false)} />}
      {showTerms && <TermsModal variant="landing" onClose={() => setShowTerms(false)} />}
      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
    </div>
  );
};

export default LandingPage;
