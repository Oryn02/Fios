import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

const UpdatesTabInner: React.FC = () => {
  const releases = [
    {
      version: 'v2.2.0',
      date: 'September 2026',
      title: 'PWA, Themes, Tutor & Study Engine UI',
      highlights: [
        'Installable PWA with VitePWA + Workbox (standalone manifest, offline-friendly shell).',
        'Theme modes: Dark / Light / System with warm off-white light tokens and Low-Power mode.',
        'Accessibility: OpenDyslexic font toggle, Zen/Deep Focus chrome hide, ARIA nav landmarks.',
        'Independent full-screen AI Tutor tab with persistent chat + optional RAG grounding.',
        'Command palette (Ctrl/Cmd+K), global toasts, cookie consent, Terms of Service modal.',
        'Markdown + LaTeX (KaTeX) in FormattedContent while keeping Mermaid fences.',
        'Flashcard touch swipe (right=Easy, left=Hard), Code Lab custom challenge prompts.',
        'Smart Notes summary revision history with undo, modular Overview widgets, module tag folders.',
        'PDF upload POST to /api/upload/pdf, IndexedDB offline mutation queue, GitHub OAuth + gist export helpers.',
        'Schema additions: document_revisions, tutor_messages, note_chunks, module tags/parent_code, prefs jsonb.',
      ],
    },
    {
      version: 'v2.1',
      date: 'September 2026',
      title: 'Timetable Proxy & Interactive Month Grid',
      highlights: [
        'Implemented local Express server proxy (port 5000) to bypass ATU CORS restrictions and feed synchronization blocks.',
        'Added fully interactive Month, Week, and Day calendar views with seamless date navigation controls.',
        'Upgraded SM-2 flashcard deck persistence layer with robust Supabase field mapping.',
      ],
    },
    {
      version: 'v2.0',
      date: 'August 2026',
      title: 'Core Study Suite Architecture',
      highlights: [
        'Integrated Gemini AI API for automated flashcard, quiz, and code exam generation.',
        'Added Active Recall "blurting" evaluator and AI grounded tutor chat.',
        'Configured dark-mode tactical UI styling optimized for late-night study sessions.',
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans text-slate-100">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-black uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" />
          SYSTEM CHANGELOG
        </div>
        <h1 className="text-3xl font-black italic uppercase text-white tracking-tight">Fios Updates</h1>
        <p className="text-xs font-mono text-slate-400">Current release · v2.2.0</p>
      </header>

      <div className="space-y-4">
        {releases.map((rel, idx) => (
          <div key={idx} className="bg-[#0e131f] border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <span className="bg-emerald-400 text-slate-950 font-mono font-black text-xs px-2.5 py-1 rounded-md uppercase">
                  {rel.version}
                </span>
                <h3 className="text-base font-black text-white italic tracking-wide">{rel.title}</h3>
              </div>
              <span className="text-xs font-mono text-slate-500 font-bold">{rel.date}</span>
            </div>

            <ul className="space-y-2.5">
              {rel.highlights.map((point, pIdx) => (
                <li key={pIdx} className="flex items-start gap-2.5 text-xs font-mono text-slate-300 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export const UpdatesTab = React.memo(UpdatesTabInner);
export default UpdatesTab;
