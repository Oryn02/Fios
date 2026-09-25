import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, BrainCircuit, Calendar, FileText, Code2, Timer } from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: (mode: 'signin' | 'signup') => void;
}

const features = [
  { icon: BrainCircuit, color: 'emerald', title: 'AI Flashcards & Quizzes', body: 'Generate tailored study decks and multiple-choice quizzes from raw lecture notes with the Gemini API.' },
  { icon: Code2, color: 'cyan', title: 'Interactive Code Lab', body: 'Solve AI-generated coding challenges in an embedded Monaco editor and get instant graded feedback.' },
  { icon: FileText, color: 'purple', title: 'Slide & PDF Analysis', body: 'Upload lecture slides or PDFs and turn dense material into concise, structured study cards.' },
  { icon: Calendar, color: 'amber', title: 'Timetable Syncing', body: 'Import college iCal / WebCAL feeds to track live lectures, venues, and assessment dates.' },
  { icon: Timer, color: 'emerald', title: 'Persistent Focus Timer', body: 'A global Pomodoro timer follows you across every view so deep-work sessions never reset.' },
  { icon: Sparkles, color: 'cyan', title: 'Organised by Module', body: 'Group decks, quizzes, code exams, and tasks under each of your academic modules.' },
];

const colorMap: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-400',
  cyan: 'bg-cyan-500/10 text-cyan-400',
  purple: 'bg-purple-500/10 text-purple-400',
  amber: 'bg-amber-500/10 text-amber-400',
};

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-black overflow-x-hidden">
      {/* Ambient flares */}
      <div className="fixed top-[-10%] left-[10%] w-[36rem] h-[36rem] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[5%] w-[32rem] h-[32rem] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Nav */}
      <header className="w-full border-b border-slate-800/60 bg-[#0b0f17]/70 backdrop-blur-md sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-400 to-cyan-400 p-[1.5px]">
              <div className="w-full h-full bg-[#0b0f17] rounded-[10px] flex items-center justify-center">
                <span className="font-black italic text-transparent bg-clip-text bg-gradient-to-tr from-emerald-400 to-cyan-400 text-lg">F</span>
              </div>
            </div>
            <span className="font-black text-xl tracking-tight text-white">
              Fios <span className="text-emerald-400 italic font-bold">Studio</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => onOpenAuth('signin')} className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2 cursor-pointer">
              Sign in
            </button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onOpenAuth('signup')}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              Create your account
            </motion.button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-16 flex flex-col items-center relative z-10">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl space-y-6 pt-8 pb-12"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" /> Your Academic Command Center
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Your semester. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">All together in Fios.</span>
          </h1>

          <p className="text-slate-400 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
            Flashcards, AI quizzes, a live code lab, slide breakdowns, and schedule tracking in one unified hub — so you can stop organising and start mastering your coursework.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onOpenAuth('signup')}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3.5 rounded-xl transition-colors flex items-center gap-2 shadow-xl shadow-emerald-500/25 text-base cursor-pointer"
            >
              Create your account <ArrowRight className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onOpenAuth('signin')}
              className="border border-slate-700 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-800 text-slate-200 font-semibold px-6 py-3.5 rounded-xl transition-colors text-base cursor-pointer"
            >
              Sign in →
            </motion.button>
          </div>
        </motion.section>

        {/* Features */}
        <section className="w-full pt-12 space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">One Connected Workflow</span>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Everything you need to ace your modules.</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  whileHover={{ y: -4 }}
                  className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-emerald-500/30 transition-colors backdrop-blur-sm"
                >
                  <div className={`${colorMap[f.color]} p-3 rounded-xl w-fit mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.body}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="w-full mt-16 p-8 md:p-12 rounded-3xl bg-gradient-to-b from-slate-900 to-emerald-950/30 border border-emerald-500/20 text-center space-y-6"
        >
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Make Space For What Matters</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">Your next semester starts in Fios.</h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm md:text-base">
            Give your academic life a unified place to live, with full Supabase persistence across every device.
          </p>
          <div className="pt-2">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onOpenAuth('signup')}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-8 py-3.5 rounded-xl transition-colors shadow-xl shadow-emerald-500/20 text-base cursor-pointer"
            >
              Get Started Free
            </motion.button>
          </div>
        </motion.section>
      </main>

      <footer className="w-full border-t border-slate-800/60 py-6 text-center text-xs text-slate-500 relative z-10">
        <p>Fios Studio · Your Student Academic Hub</p>
      </footer>
    </div>
  );
};

export default LandingPage;
