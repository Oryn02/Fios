import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Layers, HelpCircle, Code2, FileText, Target, Timer,
  ShieldCheck, KeyRound, Play, Check, Shield, X, ChevronDown, Mail,
} from 'lucide-react';
import { FiosLogo } from './FiosLogo';
import { enableDemoAndReload } from '../lib/demo';
import { TermsModal } from './TermsModal';
import { CookiePolicyModal } from './CookiePolicyModal';
import { GdprModal } from './GdprModal';
import { SupportModal } from './SupportModal';

interface LandingPageProps {
  onOpenAuth: (mode: 'signin' | 'signup') => void;
}

const features = [
  { icon: Layers, title: 'SM-2 Spaced Flashcards', body: 'AI-generated decks scheduled with the proven SM-2 algorithm so you review exactly when it matters.' },
  { icon: HelpCircle, title: 'MCQ Quiz Generation', body: 'Turn any notes into multiple-choice exams with explanations, saved per module.' },
  { icon: Code2, title: 'Monaco Code Exams', body: 'Solve AI-generated bug-fix, output-prediction and logic challenges in a real code editor.' },
  { icon: FileText, title: 'PDF & Note AI Tutor', body: 'Upload material for instant summaries, glossaries, and a grounded AI tutor chat.' },
  { icon: Target, title: 'Grade Predictor', body: 'Know the exact scores you need across assessments to hit your target grade.' },
  { icon: Timer, title: 'Global Pomodoro Timer', body: 'A persistent focus timer follows you everywhere and tracks your weekly study goal.' },
];

const walkthrough = [
  {
    id: 'flashcards', label: 'Notes → Flashcards',
    lines: ['# Paste lecture notes', 'Photosynthesis converts light…', '', '→ 8 SM-2 flashcards generated', 'Q: Where does it occur?', 'A: In the chloroplasts.'],
  },
  {
    id: 'quiz', label: 'Notes → Quiz',
    lines: ['# Paste lecture notes', 'The mitochondria produces ATP…', '', '→ 5-question MCQ exam', 'Q: Powerhouse of the cell?', '✓ Mitochondria'],
  },
  {
    id: 'code', label: 'Prompt → Code Exam',
    lines: ['// Bug-fix challenge (JS)', 'function sum(a){', '  for(i=0;i<a.length-1;i++)…', '}', '→ Fix the off-by-one bug', '✓ Graded 100/100'],
  },
];

const faqs = [
  {
    category: 'Product',
    q: 'What is Fios useful for as a student?',
    a: 'Fios is your academic command center: turn lecture PDFs into SM-2 flashcards, MCQ quizzes, and Monaco code challenges; chat with a grounded AI Tutor; track focus with Pomodoro + soundscapes; plan revision with the Flight Plan; and forecast grades per module — all in one dashboard.',
  },
  {
    category: 'Product',
    q: 'Is Fios free to use?',
    a: 'Yes for personal academic use. Sign up, manage modules, run focus sessions, and organize decks for free. AI generation uses your own Gemini key (BYO-Key) so you control quota and cost — Fios does not resell AI access.',
  },
  {
    category: 'Study features',
    q: 'Which study tools are included in v2.2.1?',
    a: 'SM-2 flashcards (with swipe Easy/Hard), MCQ Exam Mode, Code Lab with custom prompts, Smart Notes + full-screen AI Tutor (RAG over your notes), Active Recall “blurting”, Revision Flight Plan, grade predictor, ATU/iCal timetable overlay, PWA offline queue, and modular dashboard widgets.',
  },
  {
    category: 'Privacy',
    q: 'How does Fios protect my lecture notes and data?',
    a: 'Notes and decks live in your private Supabase rows under Row Level Security. We follow GDPR-aligned practices, do not sell data, and do not use your uploads for public model training. Essential browser storage keeps you signed in; see our Cookie Policy for essential vs analytics details.',
  },
  {
    category: 'Privacy',
    q: 'How does Bring Your Own Key (BYO-Key) work?',
    a: 'Add a free Google Gemini API key in Settings. It is stored on your profile and sent only with your AI requests. Cloud AI is locked for live-demo guests — sign in (email or GitHub) to unlock generation.',
  },
  {
    category: 'Account',
    q: 'How do I set up an account?',
    a: 'Click Sign up, register with email/password or Continue with GitHub, then open Settings to add your Gemini key. Optionally import an iCal/WebCal timetable and create modules for each subject. Prefer a tour first? Use Explore Live Demo — AI cloud features stay locked until you sign in.',
  },
  {
    category: 'Account',
    q: 'Can I use Fios on multiple devices?',
    a: 'Yes. Authenticated progress syncs via Supabase (modules, decks, quizzes, notes, focus logs). Install the PWA for a standalone app shell; offline actions queue in IndexedDB and sync when you reconnect.',
  },
];

const techBadges = ['React 19', 'TypeScript', 'Tailwind CSS', 'Supabase', 'Gemini API', 'Framer Motion'];

const PrivacyModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-slate-100">
    <div className="absolute inset-0" onClick={onClose} />
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-800 bg-[#0e131f] p-6 sm:p-8 space-y-6 shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#07090e] border border-slate-800 text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black uppercase text-white">Privacy Policy & GDPR Statement</h3>
            <p className="text-[11px] font-mono text-slate-400">Fios Academic Command Center</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200 cursor-pointer p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">1. Data Controller & Overview</h4>
          <p>
            Fios ("we", "our", or "us") respects your privacy and is committed to protecting your personal data in accordance with the General Data Protection Regulation (GDPR) and Irish data protection legislation. This privacy statement explains how we handle information within this academic command center application.
          </p>
        </section>

        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">2. Information We Collect</h4>
          <p>
            When you register or sign in, we process limited personal data necessary for authentication and core functionality, including:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
            <li>Account credentials (email address and encrypted authentication tokens managed securely via Supabase).</li>
            <li>User-generated academic data (notes, uploaded documents, flashcard decks, focus session logs, and profile preferences).</li>
          </ul>
        </section>

        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">3. Purpose and Legal Basis</h4>
          <p>
            Your information is processed strictly to provide, maintain, and secure your personal study environment, synchronize your academic modules, and power AI-driven study tools. Data is never sold, rented, or shared with third-party advertisers.
          </p>
        </section>

        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">4. Data Security and Your Rights</h4>
          <p>
            We implement robust technical and organizational security measures to protect your data. Under the GDPR, you retain the right to access, correct, or request complete erasure of your personal data and account records at any time by contacting support or deleting your account from your settings.
          </p>
        </section>
      </div>

      <div className="border-t border-slate-800 pt-4 flex justify-end">
        <button
          onClick={onClose}
          className="px-5 py-2.5 bg-emerald-400 text-slate-950 font-black uppercase text-xs rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
        >
          Close Policy
        </button>
      </div>
    </motion.div>
  </div>
);


export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  const [tab, setTab] = useState('flashcards');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showCookies, setShowCookies] = useState(false);
  const [showGdpr, setShowGdpr] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const activeWalk = walkthrough.find((w) => w.id === tab) || walkthrough[0];

  return (
    <div data-theme="dark" className="min-h-dvh bg-black text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-black overflow-x-hidden">
      <div className="fixed top-[-15%] left-[5%] w-[40rem] h-[40rem] bg-emerald-500/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed bottom-[-15%] right-[0%] w-[34rem] h-[34rem] bg-teal-500/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Nav — public; legal links require no auth */}
      <header className="w-full border-b border-white/10 bg-black/60 backdrop-blur-md sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto gap-4">
          <FiosLogo size="md" fixedEmerald />
          <nav className="hidden lg:flex items-center gap-4 text-xs font-medium text-slate-400" aria-label="Legal">
            <button type="button" onClick={() => setShowTerms(true)} className="hover:text-emerald-400 cursor-pointer">Terms</button>
            <button type="button" onClick={() => setShowPrivacy(true)} className="hover:text-emerald-400 cursor-pointer">Privacy</button>
            <button type="button" onClick={() => setShowGdpr(true)} className="hover:text-emerald-400 cursor-pointer">GDPR</button>
            <button type="button" onClick={() => setShowCookies(true)} className="hover:text-emerald-400 cursor-pointer">Cookies</button>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={() => onOpenAuth('signin')} className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2 cursor-pointer">Sign in</button>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => onOpenAuth('signup')}
              className="bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-semibold text-sm px-4 py-2 rounded-lg shadow-lg shadow-emerald-500/20 cursor-pointer">
              Get Started Free
            </motion.button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 w-full relative z-10">
        {/* Hero */}
        <section className="text-center max-w-4xl mx-auto pt-20 pb-14 space-y-7">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold">
            <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Powered by Gemini API & SM-2 Spaced Repetition
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05]">
            Master Your Modules <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">in Half the Time.</span>
          </motion.h1>

          <p className="text-slate-400 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
            Fios turns your notes into SM-2 flashcards, MCQ exams, Monaco code challenges, and an AI tutor — with a global focus timer and grade predictor to keep you on track.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => onOpenAuth('signup')}
              className="bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-bold px-6 py-3.5 rounded-xl flex items-center gap-2 shadow-xl shadow-emerald-500/25 text-base cursor-pointer">
              Get Started Free <ArrowRight className="w-5 h-5" />
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={enableDemoAndReload}
              className="border border-white/15 hover:border-emerald-400/50 bg-white/5 hover:bg-white/10 text-slate-100 font-semibold px-6 py-3.5 rounded-xl text-base cursor-pointer flex items-center gap-2">
              <Play className="w-4 h-4" /> Explore Live Demo
            </motion.button>
          </div>

          {/* App preview frame */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-3 shadow-2xl shadow-emerald-500/10">
            <div className="rounded-xl border border-white/10 bg-black/60 overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                <span className="ml-3 text-[11px] font-mono text-slate-500">fios.app / dashboard</span>
              </div>
              <div className="grid grid-cols-3 gap-3 p-5 text-left">
                {[
                  { t: 'Good morning, Oryn', s: 'Weekly goal · 68%' },
                  { t: 'SM-2 Flashcards', s: '12 due today' },
                  { t: 'Code Lab', s: 'Bug-fix · JS' },
                  { t: 'AI Tutor', s: 'Ask your notes' },
                  { t: 'Grade Predictor', s: 'Need 74% on final' },
                  { t: 'Focus Timer', s: '24:31 remaining' },
                ].map((c) => (
                  <div key={c.t} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-xs font-bold text-white truncate">{c.t}</p>
                    <p className="text-[10px] font-mono text-emerald-400 mt-1">{c.s}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {/* Feature deep-dive grid */}
        <section className="py-16 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">One Connected Workflow</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white">Everything you need to ace your modules.</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.35, delay: i * 0.05 }} whileHover={{ y: -4 }}
                  className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition-colors backdrop-blur-sm">
                  <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl w-fit mb-4"><Icon className="w-6 h-6" /></div>
                  <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.body}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Interactive walkthrough */}
        <section className="py-12 space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">See It In Action</span>
            <h2 className="text-2xl md:text-3xl font-bold text-white">From raw notes to study-ready in seconds.</h2>
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {walkthrough.map((w) => (
              <button key={w.id} onClick={() => setTab(w.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer ${
                  tab === w.id ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950' : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white'
                }`}>
                {w.label}
              </button>
            ))}
          </div>
          <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-black/60 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/10 text-[11px] font-mono text-slate-500">fios · transform</div>
            <AnimatePresence mode="wait">
              <motion.pre key={activeWalk.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }} className="p-5 text-xs font-mono leading-relaxed text-slate-300 whitespace-pre-wrap">
                {activeWalk.lines.map((l, i) => (
                  <div key={i} className={l.startsWith('→') ? 'text-emerald-400 font-bold' : l.startsWith('✓') ? 'text-emerald-300' : ''}>{l || '\u00A0'}</div>
                ))}
              </motion.pre>
            </AnimatePresence>
          </div>
        </section>

        {/* BYO-Key section */}
        <section className="py-14">
          <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 to-black p-8 md:p-12 grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4" /> Privacy-First Architecture
              </div>
              <h2 className="text-3xl font-bold text-white">Bring Your Own Gemini Key.</h2>
              <p className="text-slate-400 leading-relaxed">
                Fios never resells AI access. Plug in your own free Google Gemini API key — it stays scoped to your account and powers every AI feature directly, so you stay in full control of usage and privacy.
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                {['Your key, your quota, your data', 'Stored on your profile — never shared', 'Unlock quizzes, code exams & the AI tutor'].map((t) => (
                  <li key={t} className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> {t}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400"><KeyRound className="w-5 h-5" /> <span className="text-sm font-bold text-white">Gemini API Key</span></div>
              <div className="bg-black/60 border border-white/10 rounded-lg px-3 py-2.5 font-mono text-xs text-slate-500">AIza••••••••••••••••••••</div>
              <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Key validated · AI features unlocked</div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-14 max-w-3xl mx-auto space-y-6" id="faq">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Questions & Answers</span>
            <h2 className="text-3xl font-bold text-white">Frequently Asked Questions</h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto">
              Product utility, privacy, study tools, and account setup — expand any card for a clear answer.
            </p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden transition-shadow hover:shadow-[0_0_0_1px_rgba(52,211,153,0.25)]"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="w-full p-4 text-left flex items-start justify-between gap-4 font-bold text-sm text-white hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    <span className="space-y-1.5 min-w-0">
                      <span className="block text-[10px] font-mono font-black uppercase tracking-widest text-emerald-400/90">
                        {faq.category}
                      </span>
                      <span className="block leading-snug">{faq.q}</span>
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-180 text-emerald-400' : ''}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-3">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA banner */}
        <section className="py-14 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">Your next semester starts in Fios.</h2>
          <p className="text-slate-400 max-w-xl mx-auto">Free to configure with full Supabase persistence across every device.</p>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => onOpenAuth('signup')}
            className="bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-bold px-8 py-3.5 rounded-xl shadow-xl shadow-emerald-500/20 text-base cursor-pointer">
            Get Started Free
          </motion.button>
        </section>
      </main>

      {/* Footer — legal links are public (no auth) */}
      <footer className="w-full border-t border-white/10 py-8 relative z-10">
        <div className="max-w-6xl mx-auto px-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
            <div className="space-y-3">
              <FiosLogo size="sm" fixedEmerald />
              <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                Academic command center · v2.2.1. Legal documents below open without signing in.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
              <div className="space-y-2">
                <p className="text-[10px] font-mono font-black uppercase tracking-widest text-emerald-400">Account</p>
                <button type="button" onClick={() => onOpenAuth('signin')} className="block text-slate-400 hover:text-white cursor-pointer text-left">Sign in</button>
                <button type="button" onClick={() => onOpenAuth('signup')} className="block text-slate-400 hover:text-white cursor-pointer text-left">Sign up</button>
                <button type="button" onClick={enableDemoAndReload} className="block text-slate-400 hover:text-white cursor-pointer text-left">Live demo</button>
                <a href="#faq" className="block text-slate-400 hover:text-emerald-400">FAQ</a>
              </div>
              <div className="space-y-2" aria-label="Legal documents">
                <p className="text-[10px] font-mono font-black uppercase tracking-widest text-emerald-400">Legal</p>
                <button type="button" onClick={() => setShowTerms(true)} className="block text-slate-400 hover:text-emerald-400 cursor-pointer underline text-left">Terms of Service</button>
                <button type="button" onClick={() => setShowPrivacy(true)} className="block text-slate-400 hover:text-emerald-400 cursor-pointer underline text-left">Privacy Policy</button>
                <button type="button" onClick={() => setShowGdpr(true)} className="block text-slate-400 hover:text-emerald-400 cursor-pointer underline text-left">GDPR Compliance</button>
                <button type="button" onClick={() => setShowCookies(true)} className="block text-slate-400 hover:text-emerald-400 cursor-pointer underline text-left">Cookie Policy</button>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-mono font-black uppercase tracking-widest text-emerald-400">Help</p>
                <button type="button" onClick={() => setShowSupport(true)} className="text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1 cursor-pointer">
                  <Mail className="w-3.5 h-3.5" /> Support
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {techBadges.map((b) => (
              <span key={b} className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono text-slate-400">{b}</span>
            ))}
          </div>
          <p className="text-[11px] text-slate-600">Fios v2.2.1 · Built as an AI test app with Google Gemini & Cursor Agent Mode.</p>
        </div>
      </footer>

      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      {showCookies && <CookiePolicyModal onClose={() => setShowCookies(false)} />}
      {showGdpr && <GdprModal onClose={() => setShowGdpr(false)} />}
      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
    </div>
  );
};

export default LandingPage;