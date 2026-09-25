import React from 'react';
import { ArrowRight, Sparkles, BrainCircuit, Calendar, FileText, CheckCircle2 } from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: (mode: 'signin' | 'signup') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* Navigation Header */}
      <header className="w-full border-b border-slate-800/80 bg-[#0b0f17]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-xl text-emerald-400">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-wider text-white">
            FIOS <span className="text-emerald-400 italic">STUDIO</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => onOpenAuth('signin')}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2"
          >
            Sign in
          </button>
          <button
            onClick={() => onOpenAuth('signup')}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm px-4 py-2 rounded-lg transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            Create your account
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-16 flex flex-col items-center">
        {/* Hero Section */}
        <section className="text-center max-w-3xl space-y-6 pt-8 pb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" /> Your Academic Command Center
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Your semester. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              All together.
            </span>
          </h1>

          <p className="text-slate-400 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
            Flashcards, AI quizzes, slide breakdowns, and schedule tracking in one unified hub. Built so you can stop organizing and focus on mastering your coursework.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={() => onOpenAuth('signup')}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3.5 rounded-xl transition-all flex items-center gap-2 shadow-xl shadow-emerald-500/25 text-base active:scale-95"
            >
              Create your account <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => onOpenAuth('signin')}
              className="border border-slate-700 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-800 text-slate-200 font-semibold px-6 py-3.5 rounded-xl transition-all text-base"
            >
              Sign in &rarr;
            </button>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="w-full pt-12 space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">One Connected Workflow</span>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Everything you need to ace your modules.</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4 pt-4">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/30 transition-all group">
              <div className="bg-emerald-500/10 p-3 rounded-xl w-fit text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">AI Flashcards & Quizzes</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Generate tailored study decks and interactive multiple-choice quizzes directly from your raw lecture notes using Gemini API.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/30 transition-all group">
              <div className="bg-cyan-500/10 p-3 rounded-xl w-fit text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Slide & Vision Analysis</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Upload PNG/PDF lecture slides or handwritten notes. Extract key concepts and instant summaries automatically.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/30 transition-all group">
              <div className="bg-purple-500/10 p-3 rounded-xl w-fit text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Timetable Syncing</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Import college iCal files or WebCAL URLs to keep track of live lectures, venues, and upcoming assessment dates.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/30 transition-all group">
              <div className="bg-amber-500/10 p-3 rounded-xl w-fit text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Bring Your Own Key</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Configure your own personal Gemini API key in settings for unlimited study generation with complete privacy control.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA Card */}
        <section className="w-full mt-16 p-8 md:p-12 rounded-3xl bg-gradient-to-b from-slate-900 to-emerald-950/30 border border-emerald-500/20 text-center space-y-6">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Make Space For What Matters</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">Your next semester starts here.</h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm md:text-base">
            Give your academic life a unified place to live. Free to configure with full Supabase persistence.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onOpenAuth('signup')}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-8 py-3.5 rounded-xl transition-all shadow-xl shadow-emerald-500/20 text-base active:scale-95"
            >
              Get Started Free
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        <p>FIOS Studio &bull; Your Student Academic Hub</p>
      </footer>
    </div>
  );
};