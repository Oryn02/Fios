import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

const UpdatesTabInner: React.FC = () => {
  const releases = [
    {
      version: 'v3.1.0',
      date: 'September 2026',
      title: 'Quick Nav shortcut + polish',
      highlights: [
        'Quick Nav (command palette): ⌘K / Ctrl+K reliably opens the same “Jump to a tab or action…” palette as the header ⌘K chip — capture-phase handler with preventDefault so browser find/omnibox bindings do not steal Ctrl+K.',
        'Shortcut is ignored while typing in inputs, textareas, or contenteditable fields (Esc still closes an open palette); bare K never opens Quick Nav.',
        'Version bump to v3.1.0 across packages, chrome, Updates, and README.',
      ],
    },
    {
      version: 'v3.0.0',
      date: 'September 2026',
      title: 'Major study OS — multimodal tutor, reminders, streaks & more',
      highlights: [
        'AI Tutor multimodal uploads: PDFs, TXT, and photos (PC + mobile camera/gallery) so you can ask about slides and diagrams with your Gemini key.',
        'Exam readiness heatmap: clearer breakdown of how readiness % is calculated (reviews, quizzes, saved materials) with explanatory tooltips.',
        'Grade Predictor: fixed leading-zero display (“039”) and cleaner weight/score/target parsing so predictions update correctly.',
        'Smart Flight Plan routing: Review opens the right deck/doc/MCQ/code review; Run/Make routes to creation and studio flows.',
        'Mobile task saving: correct ISO timestamps and timezone handling for academic tasks in browsers and PWA.',
        'Review Queue: Overview due cards open an active SM-2 flashcard session (not Studio dump).',
        'Version bump to v3.0.0 across packages, chrome, Updates, and README.',
        'Privacy & Terms: disclosures for optional Web Push class reminders and multimodal uploads via your API key; push is optional and does not guarantee attendance accuracy.',
        'Landing FAQ & highlights: Web Push / Class Reminders, AI multimodal PDF/photo upload, sticky mobile header, custom module tags.',
        'Class Reminders: browser notifications with 5/10/15/30 minute lead times (Settings); optional server Web Push when VAPID is configured on the host.',
        'Smart Notes schema: additive `documents.content` migration + PostgREST reload guidance; optional `push_subscriptions` table in supabase/schema.sql.',
        'Focus Timer ambient soundscapes: AudioContext unlock fixes for iOS/Android autoplay.',
        'Schedule iCal: helper for finding your official feed + clearer error toasts on sync/import failures.',
        'Optional course codes on create/edit; deck/module badges prefer full module names where available.',
        'Inline rename: click-to-edit titles for decks, Smart Notes, MCQ quizzes, and Code Lab exams.',
        'Save flows: module selector with create-new-module on the fly when assigning content.',
        'MCQ Exam Mode: choose 5 / 10 / 20 / 40 questions; count passed through to Gemini.',
        'SM-2 onboarding tooltip on first flashcard rating (localStorage `fios_sm2_onboarded`).',
        'Offline/online network indicator when the mutation queue / cache is active.',
        'Sticky mobile top header during vertical scroll.',
        'Holiday Overview greetings (Halloween, Christmas window Dec 24–26, St Patrick’s Day, Easter, and more) instead of plain Good morning/afternoon/evening.',
        'Holiday themes: day-only accent palettes for key holidays that revert after the day; landing stays emerald; your saved theme is not permanently overwritten.',
        'Christmas window: theme Dec 24–26 with Eve / Christmas / St Stephen’s Day greetings.',
        'Study streak contribution heatmap on Overview from Pomodoro minutes + flashcard reviews (current + longest streak).',
        'Brain Dump inbox: floating quick-capture scratchpad near the FAB dock with optional AI parse into tasks.',
        'Semester GPA panel in Grade Predictor: cumulative weighted average vs Irish/ATU-style honours thresholds.',
        'Flashcard deck export/import: JSON download, shareable code, and Import Deck modal in Modules.',
        'Smart Notes audio / vision path: lecture audio or photos → Gemini multimodal notes then summarize.',
        'Exam & submission countdown widget on Overview from module exam dates and task due times.',
        'Flashcard reviews feed the streak heatmap via `recordFlashcardReview` on successful SM-2 ratings.',
      ],
    },
    {
      version: 'v2.2.9',
      date: 'September 2026',
      title: 'Mobile widgets OFF + drawer scroll lock',
      highlights: [
        'Mobile: Quick Widget FAB and Pomodoro floating widget now reliably default OFF when the user has not toggled them in Settings — including for returning users whose prefs still had the old baked-in `true` defaults.',
        'Adds `floatingWidgetsExplicit` so intentional Settings toggles are preserved; profile sync no longer re-enables widgets from legacy remote prefs.',
        'Desktop viewport defaults stay ON until the user changes them; Reset Preferences returns to viewport-aware defaults.',
        'Mobile nav drawer: background page scroll is locked while the drawer/overlay is open (body position fixed + touchmove blocked on backdrop); scroll position restored on close. Drawer panel itself still scrolls.',
        'Version alignment: packages, HTML title, Updates tab, and README report v2.2.9.',
      ],
    },
    {
      version: 'v2.2.8',
      date: 'September 2026',
      title: 'Logo & PWA icon polish',
      highlights: [
        'In-app Fios mark: rebalanced `</>` proportions — wider optical balance, even gaps between `<` `/` `>`, comfortable padding inside the square, slightly more space before the wordmark.',
        'PWA / Add to Home Screen / Apple touch: regenerated white `</>` on solid black with ~18–22% inset (centered, not tall-stretched or edge-cramped); apple-touch 180×180, 192/512, maskable, and favicon share the same geometry.',
        'Header logo → Overview and landing emerald brand lock unchanged from v2.2.7.',
        'Version alignment: packages, HTML title, Updates tab, and README report v2.2.8.',
      ],
    },
    {
      version: 'v2.2.7',
      date: 'September 2026',
      title: 'Mobile widget defaults, SM-2 previews & brand polish',
      highlights: [
        'Mobile: Quick Widget FAB and Pomodoro floating widget default OFF for new users / unsaved prefs; explicit saved prefs are preserved. Desktop defaults unchanged.',
        'SM-2 rating buttons: Again / Hard / Good / Easy previews differentiate meaningfully (e.g. new cards ~1m / ~10m / 1d / 4d) and match the schedule written on rate; Active Recall Reveal-before-grade unchanged.',
        'Landing / logged-out marketing: locked to default emerald brand + dark chrome — ignores saved Settings accent and Light/System remaps (in-app theme/accent unchanged).',
        'Logo mark: decorative orbit dots / frame removed — in-app `</>` only. PWA / Apple touch icons rebuilt as larger white `</>` on solid black (no border chrome); apple-touch 180×180 + 192/512/maskable refreshed.',
        'Command palette: ⌘K / Ctrl+K reliably opens the same palette as the header ⌘ K chip (capture-phase handler so browser search bindings do not steal it).',
        'Smart Quick Widget: Zen / Deep Focus available in the action catalog (toggle enter/exit); mobile Quick Widget still defaults off.',
        'Version alignment: packages, HTML title, Updates tab, and README report v2.2.7.',
      ],
    },
    {
      version: 'v2.2.6',
      date: 'September 2026',
      title: 'Landing density, mobile uploads & PWA icons',
      highlights: [
        'Landing hero: tighter top spacing so brand, headline, and CTAs sit higher — no tall empty band under the nav.',
        'Product window mockup scaled down and inset so it no longer dominates the hero / study-hubs boundary.',
        'FAQ and study-hubs copy expanded (tutor grounding, unified agenda, multi-device) so the page feels fuller below the fold.',
        'Dashboard header: smaller hamburger / X, centered in the header row (not resting on the bottom divider); Fios logo + wordmark enlarged.',
        'Header Fios logo / wordmark is a button that navigates to Overview (keyboard + cursor pointer).',
        'Mobile uploads: removed the iOS “PDF extraction unavailable” block; PDFs upload via Files and extract on the server when needed; Android never blocked.',
        'Images from iPhone Photos / Android gallery accepted in study upload (Vision / multimodal → notes); SUPPORTS copy updated for PDF, TXT, and images.',
        'Flashcards generate: hardened card payload parsing and safe rich-text rendering to stop the mobile “undefined is not a function” crash.',
        'PWA / Add to Home Screen: regenerated apple-touch-icon 180×180 and 192/512 PNGs from the current Fios mark with safe padding; manifest + HTML link tags updated.',
        'Version alignment: packages, HTML title, Updates tab, and README report v2.2.6.',
      ],
    },
    {
      version: 'v2.2.5',
      date: 'September 2026',
      title: 'Nav chrome polish & agenda by due date',
      highlights: [
        'Header hamburger / X restyled to match the top bar — same size, radius, and accent border as neighbouring chrome controls, vertically aligned with the Fios logo; toggle behaviour unchanged.',
        'Compact agenda / unified timeline: timed tasks sort and appear by due date (not start), so deadlines land on the correct calendar day alongside classes.',
        'Agenda date headers: Today / Tomorrow / weekday groups so classes and tasks sit under clear calendar days instead of a flat undated list.',
        'Overview Focus card: no more “You’re all caught up” flash while tasks are still loading — shows a loading state until the real pending count arrives.',
        'ATU Academic Calendar: stripped leftover `[cite: N]` citation markers from key-date descriptions so copy renders cleanly.',
        'Mobile polish: Focus/agenda/header wrap without overflow; bottom nav scrollable; Schedule institution field full-width on small screens; ATU filter chips typed as buttons.',
        'Version alignment: packages, HTML title, Updates tab, and README report v2.2.5.',
      ],
    },
    {
      version: 'v2.2.4',
      date: 'September 2026',
      title: 'Nav toggle, task dates, support send & landing refresh',
      highlights: [
        'Header menu (hamburger / X) beside the Fios logo toggles the mobile drawer and the desktop sidebar; drawer sits below the header so the toggle always stays clickable.',
        'Task create Start / Due fields use a reliable datetime-local control (theme-aware color-scheme + open-picker button) that updates state and saves timed agenda tasks.',
        'Contact Support: keep showing the support inbox (`VITE_SUPPORT_EMAIL` or oryn02@gmail.com); add an in-app message form that POSTs to `/api/support` and emails the inbox via Resend/SendGrid when configured — clear error if the provider key is missing (no crash). Mailto remains optional.',
        'Landing page refresh: brand-first hero, schedule/agenda, study hubs, AI Tutor, SM-2 flashcards, Smart Notes, Code Lab, themes, PWA, and privacy/legal links — purposeful motion, responsive, aligned with the emerald/teal Fios identity.',
        'Version alignment: packages, HTML title, Updates tab, and README report v2.2.4.',
      ],
    },
    {
      version: 'v2.2.3',
      date: 'September 2026',
      title: 'Zen, schedule, agenda, privacy & visual polish',
      highlights: [
        'Zen / Deep Focus: Esc closes the mobile drawer first, then exits Zen; Exit Zen stays visible on mobile when Zen is armed; chrome hide remains study-tab only with no nav traps.',
        'Bottom nav + sidebar: customize add/hide/reorder (up to 5 mobile slots); Settings reorder uses the effective list when prefs were never saved; desktop sidebar drag + Settings persist.',
        'Floating widgets: Settings can fully disable Pomodoro and Smart Quick; profile sync no longer re-enables omitted boolean prefs; FAB / Pomodoro dock positioning hardened via FloatingDock.',
        'Smart Quick Widget: expanded action catalog, custom order, compact FAB, metrics chip; empty action list shows a clear Settings hint.',
        'PWA icons & branding: multi-size icons (192/512/maskable/apple-touch), favicon, manifest, and VitePWA alignment for installable Fios.',
        'Accent gradients: expanded theme accents (deep emerald, vibrant indigo, sunset amber, slate teal, rose quartz, neon violet, …) with FOUC-safe boot-script + ThemeContext CSS vars.',
        'Light mode: warmer cream surfaces, stronger border/contrast tokens, card/tab hierarchy (`.fios-card` / `.fios-tab`) for scannable panels.',
        'Landing FAQ: expanded Q&A section; assorted bug/UI polish across study and dashboard surfaces.',
        'SM-2 spaced repetition: Hard no longer resets like Again; Easy bonus intervals; due dates use local start-of-day; rating buttons show projected intervals; Overview/Quick due counts use `isCardDue`.',
        'Active Recall: clearer Browse vs Recall modes; quiz answer hidden until Reveal; grading copy explains why SM-2 updates matter.',
        'Universal schedule: iCal sync or manual mode for any college; institution label; unified loader for Overview + Timetable.',
        'Timetable visual states: muted/greyed finished classes (today + past days) with strikethrough/badge; Next Up highlight (accent border + badge) for the immediate upcoming class.',
        'Module accent colors: rich palette with paired light/dark text contrast; applied to module badges, subject tags, class cards, calendar pills, and heatmap chips (legacy color keys aliased).',
        'Unified agenda: CompactAgenda memoized/deferred list; classes + timed tasks interleaved chronologically with matching card styling; capped render for no freeze on load/toggles.',
        'Tasks: specific start/due date-and-time on create; timed tasks appear on the agenda timeline alongside classes.',
        'In-app Feedback & Ratings: star rating, category tags, optional anonymous message — stored securely with your profile or without a user id.',
        'Privacy & GDPR: expanded Privacy Policy and Terms (landing footer + Settings); clearer cookie/local-storage consent; Export My Data (JSON) and erasure guidance aligned with processors (Supabase, Gemini, GitHub, hosting).',
        'Mobile touch: ~44px targets on bottom nav, Zen Exit, drawer, FAB/Pomodoro; flashcard swipe ignores vertical scroll; agenda scroll uses touch-action pan-y; active: states so critical actions are not hover-only.',
        'Settings: helpful tip that a paid Gemini plan via Google AI Studio can avoid slowdowns when the free tier is overloaded (optional; link to AI Studio).',
        'Version alignment: packages, HTML title, Updates tab, and README all report v2.2.3. Builds on v2.2.2 Render/Zen/widget work without regressing Bugbot fixes.',
      ],
    },
    {
      version: 'v2.2.2',
      date: 'September 2026',
      title: 'Render deploy, API 405 fix, Zen escape & widget prefs',
      highlights: [
        'Migrated hosting docs to Render: single Web Service (repo root) can serve API+SPA, or split `server` + Static Site `client`. Never Root Directory=`src` (ENOENT package.json).',
        'Production API URL guidance: `VITE_API_URL=https://fios-akjy.onrender.com` for split Static Site; leave empty for same-origin single service.',
        'server `npm run build` (`tsc` → `dist/`); Render build uses `npm install --include=dev` so tsc works with NODE_ENV=production.',
        'Fixes production 405s on flashcards, AI tutor, iCal timetable sync, PDF upload, and related POSTs (no more SPA/static intercepting `/api/*`).',
        'College Timetable uses same-origin or Render `/api/ical-proxy` (POST + GET); Workbox NetworkOnly for `/api/*`.',
        'Zen / Deep Focus: chrome hide only on study tabs; Esc, floating Exit Zen, mobile Menu/Settings escape — no nav traps.',
        'Bottom navbar customization: add, hide, reorder up to 5 slots; desktop sidebar drag + Settings reorder (persisted prefs).',
        'Settings toggles to fully disable Pomodoro Widget and Smart Quick Widget; tailor Smart Quick actions, order, compact FAB, and metrics chip.',
      ],
    },
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
        <p className="text-xs font-mono text-slate-400">Current release · v3.1.0</p>
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
