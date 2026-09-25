import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Sparkles, Layers, HelpCircle, Code2, FileText, Target, Timer,
  ShieldCheck, KeyRound, Play, Check,
} from 'lucide-react';
import { FiosLogo } from './FiosLogo';
import { enableDemoAndReload } from '../lib/demo';

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

const techBadges = ['React 19', 'TypeScript', 'Tailwind CSS', 'Supabase', 'Gemini API', 'Framer Motion'];

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  const [tab, setTab] = useState('flashcards');
  const activeWalk = walkthrough.find((w) => w.id === tab) || walkthrough[0];

  return (
    // Fixed pitch-black + emerald identity — independent of dashboard theming.
    <div data-theme="dark" className="min-h-dvh bg-black text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-black overflow-x-hidden">
      <div className="fixed top-[-15%] left-[5%] w-[40rem] h-[40rem] bg-emerald-500/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed bottom-[-15%] right-[0%] w-[34rem] h-[34rem] bg-teal-500/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Nav */}
      <header className="w-full border-b border-white/10 bg-black/60 backdrop-blur-md sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
          <FiosLogo size="md" fixedEmerald />
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

          {/* Glassmorphism app preview frame */}
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

      {/* Footer */}
      <footer className="w-full border-t border-white/10 py-8 relative z-10">
        <div className="max-w-6xl mx-auto px-6 space-y-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <FiosLogo size="sm" fixedEmerald />
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <button onClick={() => onOpenAuth('signin')} className="hover:text-white cursor-pointer">Sign in</button>
              <button onClick={() => onOpenAuth('signup')} className="hover:text-white cursor-pointer">Sign up</button>
              <button onClick={enableDemoAndReload} className="hover:text-white cursor-pointer">Live demo</button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {techBadges.map((b) => (
              <span key={b} className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono text-slate-400">{b}</span>
            ))}
          </div>
          <p className="text-[11px] text-slate-600">Fios · Built as an AI test app with Google Gemini & Cursor Agent Mode.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
