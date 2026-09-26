import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

const UpdatesTabInner: React.FC = () => {
  const releases = [
    {
      version: 'v2.2.1',
      date: 'September 2026',
      title: 'Legal UX, Resilience, Schedule & Nav Polish',
      highlights: [
        'Light mode contrast revamp: slate canvas (#f8fafc), white surfaces, elevated #f1f5f9, #0f172a / #334155 text, #cbd5e1 borders, soft multi-layer shadows.',
        'Legal & compliance: dedicated Terms of Service, Cookie Policy + consent banner, GDPR Compliance modal, and public landing header/footer links (Terms / Privacy / GDPR / Cookies) with no auth required.',
        'Landing FAQ upgrade: categorized expandable FAQ (Product, Study features, Privacy, Account) with jump links from the footer.',
        'Guest AI auth guard: cloud AI surfaces (Tutor, Code Lab, PDF/multimodal, quizzes) blocked for live-demo guests with a themed GitHub sign-in modal; admin UID bypass.',
        'PWA / Vercel build: vendor chunk split (Mermaid lazy), Workbox size limit + diagrams precache ignore — unblocks production deploy.',
        'Cards / exams / docs + AI Tutor 404s: restored Vercel Express bridge (api/index.ts + rewrites), postApiJson client, and real resource IDs after create.',
        'Zen Mode escape hatch: chrome hides only on study tabs; Esc, floating Exit Zen, and header control so Settings is never a trap.',
        'Support messaging: in-app form posts to /api/support (Resend/SendGrid); inbox from VITE_SUPPORT_EMAIL / SUPPORT_EMAIL; graceful 503 if unconfigured.',
        'Code Lab readability: higher-contrast field labels, balanced editor/reference columns, clearer Submit / Save / Solution actions, multi-line seeded code formatting.',
        'Schedule & ATU: prominent Next Class card, Completed styling for finished/past sessions, monthly grid with expanded iCal RRULEs + ATU academic key dates overlay.',
        'iCal sync fix: browser never fetches timetables.atu.ie directly (CORS). Sync goes through Express POST/GET /api/ical-proxy with ATU StudentSet validation and clearer proxy/network errors.',
        'Desktop navbar drag-reorder: grip handle DnD + Alt+↑/↓, order persisted in prefs/localStorage; mobile drawer follows order without breaking bottom nav.',
        'Smart Notes / study API hardening: postApiJson + Vercel Express bridge; Workbox uses NetworkOnly for /api so HTML 404s are never cached.',
      ],
    },
    {
      version: 'v2.2.0',
      date: 'September 2026',
      title: 'Study Engine, PWA, Auth Guard & Polish',
      highlights: [
        'Audit & cleanup: removed unused orphans; Error Boundaries around widgets, Flashcards, Code Lab.',
        'PDF upload via POST /api/upload/pdf + Vite /api proxy; study engine (vision/audio, chunking, RAG).',
        'Branding: geometric </> logo, v2.2 badges; Smart Notes full-screen Tutor, custom Code Lab prompts, Markdown + LaTeX + Mermaid.',
        'Nav & a11y: drawer, hot-swappable bottom nav, Ctrl/Cmd+K palette, OpenDyslexic, ARIA landmarks.',
        'Themes & perf: Dark / Light / System, Low-Power mode, modular Overview widgets.',
        'PWA & offline: VitePWA + Workbox, IndexedDB mutation queue, iCal agenda overlay.',
        'Security base: GitHub OAuth + gist helpers, admin UID gate, Privacy foundations.',
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
    <div className="space-y-6 max-w-4xl mx-auto font-sans text-[var(--fios-text)]">
      <header className="space-y-1">
        <div className="flex items-center gap-2 accent-solid-text text-xs font-mono font-black uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" />
          System changelog
        </div>
        <h1 className="text-3xl font-black italic uppercase tracking-tight text-[var(--fios-text)]">Fios Updates</h1>
        <p className="text-xs font-mono text-[var(--fios-text-muted)]">Current release · v2.2.1</p>
      </header>

      <div className="space-y-4">
        {releases.map((rel, idx) => (
          <div key={rel.version} className="bg-[var(--fios-surface)] border fios-border rounded-xl p-6 space-y-4 shadow-[var(--fios-shadow-md)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b fios-border">
              <div className="flex items-center gap-3">
                <span className={`font-mono font-black text-xs px-2.5 py-1 rounded-md uppercase ${
                  idx === 0 ? 'accent-bg text-slate-950' : 'bg-[var(--fios-surface-2)] text-[var(--fios-text)] border fios-border'
                }`}>
                  {rel.version}
                </span>
                <h3 className="text-base font-black text-[var(--fios-text)] italic tracking-wide">{rel.title}</h3>
              </div>
              <span className="text-xs font-mono text-[var(--fios-text-muted)] font-bold">{rel.date}</span>
            </div>

            <ul className="space-y-2.5">
              {rel.highlights.map((point, pIdx) => (
                <li key={pIdx} className="flex items-start gap-2.5 text-xs font-mono text-[var(--fios-text-muted)] leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 accent-solid-text shrink-0 mt-0.5" />
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
