import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

/**
 * Semver remapped from historical labels (first published → 1.0.0).
 * See PR / internal mapping: old 2.0…3.1.14 → 1.0.0…3.5.4; 3.8.0 SaaS pack; current 4.1.0.
 */
const UpdatesTabInner: React.FC = () => {
  const releases = [
    {
      version: 'v4.1.0',
      date: 'October 2026',
      title: 'Module-first pillars, Studio hub & Roguelike surfaces',
      highlights: [
        'Locked 4-tab bottom nav: Overview · Agenda · Modules · Studio (account / network / RPG behind avatar drawer).',
        'Studio segmented hub: Notes & Audio · Quiz & Exam · Code Lab; module-locked Save to Folder after generate.',
        'Modules drill-down: condensed single-line list → full-screen hub with Back + Generate Flashcards empty funnel.',
        'Flashcard UX: Browse/Recall (i) tip, […] overflow, ✨ AI Actions, Confidence? (Guessing→Certain), clearer rating copy.',
        'Study Lab extras as vertical icon + title + subtitle list; softer dark slate-900 reading palette.',
        'Roguelike HUD (streak + level), Overview Player Card, loot-drop XP modal, Player Profile drawer.',
        'Immersive Roguelike theme tree (21 study-milestone themes) with canvas ambience + full UI palettes.',
        'Agenda = Timetable + academic calendar; iCal auto-sync keeps Unified Agenda live; Add Friend by email.',
        'Onboarding wizard + Quick Capture FAB; Settings segmented Account | Layout & Theme | Study | Integrations.',
        'Version alignment: packages, HTML title, Updates, /health, footer → v4.1.0.',
      ],
    },
    {
      version: 'v4.0.0',
      date: 'October 2026',
      title: 'Major study OS — citations through community cognitive suite',
      highlights: [
        'Source-grounded citations + View Source PDF viewer; universal importers; offline Daily Queue; browser clipper + VS Code queue extension.',
        'STEM code/sandbox cards, LMS connect, RPG progression, Course Bank votes/clone/peer-review, mind maps, Lofi lounges, vault export.',
        'Live lecture + multi-format ingest, grounded chat, viva coach, cognitive engines (JOL, Feynman, elaborate, dual-coding, anti-memorization).',
        'Mock exams, syllabus→ics, PDF highlight toolbar, past-paper matrix, pgvector knowledge graph hooks, cram sheets, delta detection, debates.',
        'Learning macros dashboard, gauntlet mode, energy-aware queues, handwriting OCR, micro-dosing PWA shortcuts, BPM audio fallback to Lofi.',
        'Landing + FAQ + Privacy/Terms/GDPR + first-class Cookie Policy & consent (essential vs preferences). No ad trackers; BYO Gemini never in cookies.',
        'Paste-ready SQL: supabase/v3.9.0-citations-clipper-offline.sql (also docs/fios-v4.0.0-citations-clipper-offline.sql).',
        'Version alignment: packages, HTML title, Updates, /health, footer → v4.0.0.',
      ],
    },
    {
      version: 'v3.9.0',
      date: 'October 2026',
      title: 'Citations → clipper → voice recall → mock exams (features 1–30)',
      highlights: [
        '1–4 Citations & View Source — cards link to PDF page + quote; SourceViewer side-by-side.',
        '5–7 Universal importers — Fios JSON, CSV, Quizlet, Notion, RemNote, Anki .apkg.',
        '8–9 Offline Daily Queue — IndexedDB cache + /api/study/offline-sync flush.',
        '10–12 Interactive code cards + Judge0/local JS runner; STEM cloze from lecture.',
        '13–15 LMS connect (Canvas/Moodle/Blackboard), weekly prep, Obsidian vault export.',
        '16–18 Roguelike RPG XP/unlocks, Course Bank vote/clone, Socratic Tutor Me + mnemonics.',
        '19–21 AI mind maps, Lofi Pomodoro lounges (socket.io), live lecture → cloze/Q&A.',
        '22–24 Grounded doc chat + viva coach; Feynman / elaborative / dual-coding hooks on cards.',
        '25 Hands-free Voice Active Recall — Web Speech STT/TTS + POST /api/study/voice-grade → FSRS.',
        '26 Full-length AI Mock Exam — /api/exam/mock-generate + mock-grade Diagnostic Scorecard.',
        '27 Body Doubling — module match, 50m silent timer, goals, end check-in chat only.',
        '28 Syllabus Parser — Gemini deadlines → .ics download + calendar hints.',
        '29 Smart PDF Highlight toolbar — Flashcard / Explain / Quiz / Add to Notes.',
        '30 PWA shortcuts (streak/review) + iOS limits in client/public/WIDGETS.md; ?tab=&review=1.',
        'Browser clipper MV3 (extensions/fios-clipper). Interleaved practice + JOL metacognition.',
        'SQL: supabase/v3.9.0-citations-clipper-offline.sql (card_jol, mock_exams, focus_buddy, syllabus_events…).',
        'Version alignment: packages, HTML title, Updates, /health, footer → v3.9.0.',
      ],
    },
    {
      version: 'v3.8.0',
      date: 'October 2026',
      title: 'Master study suite — FSRS, Study Network, live quiz, audio recap',
      highlights: [
        'Optional FSRS spaced repetition (beta) beside the existing SM-2 path — default stays SM-2 so your decks keep working.',
        'Daily due queue, Anki .apkg export, and share-to-friends alongside JSON / share codes.',
        'Study Network: friends, course bank, and classroom analytics for group streaks and quiz scores.',
        'Mock oral exam + diagram occlusion study tools powered by Gemini Flash / Pro.',
        'Audio recap player for spoken summaries of your notes (server TTS when configured).',
        'Live multiplayer quiz lobby with invite codes — solo Exam Mode unchanged.',
        'Paste-ready Supabase SQL: supabase/v3.8.0-master-saas.sql (also under supabase/migrations/).',
        'Version alignment: packages, HTML title, Updates tab, README, and API /health report v3.8.0.',
      ],
    },
    {
      version: 'v3.7.7',
      date: 'September 2026',
      title: 'Mobile drawer — no horizontal pan / stretch',
      highlights: [
        'Mobile nav drawer uses fixed width (80% / max 300px) with layout containment so the slide transform cannot widen the page.',
        'While the drawer is open, document overflow-x is locked and overscroll-behavior-x is none — opening or dragging the drawer no longer pulls or pans the main screen sideways.',
        'Backdrop and drawer shell use overflow-x / touch pan-y constraints under the header strip.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.7.7.',
      ],
    },
    {
      version: 'v3.7.6',
      date: 'September 2026',
      title: 'Mobile UI polish — clearance & expanded plan gaps',
      highlights: [
        'Overview / main scroll pad clears floating Pomodoro + Brain Dump + FAB + bottom nav — Upcoming Work / Academic Tasks headers no longer clip under chrome.',
        'Header controls sit inside the header strip (safe-area-aware height) while keeping ≥44px touch targets.',
        'Timetable day cards wrap long module titles instead of clipping mid-word; drawer long-press reorder no longer triggers native text selection.',
        'FAB hides “Start Pomodoro” when the floating Pomodoro widget is already enabled.',
        'Mobile drawer regrouped: Core Hubs · Academic Tools · System Preferences (active route highlight retained).',
        'Dashboard greeting truncates on narrow phones; secondary widgets compress into mobile pills; heatmap edge-fade swipe masks.',
        'Alpha-transparent semantic chips/tags; sanitizeDeckTitle strips PAGE n; code blocks dark-locked in both themes; flashcard rating rows ≥12px above the floating zone.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.7.6.',
      ],
    },
    {
      version: 'v3.7.5',
      date: 'September 2026',
      title: 'Theme Engine & Light Mode overhaul',
      highlights: [
        'Theme Engine: semantic CSS tokens (`--background`, `--foreground`, `--card`, `--primary`, …) for Light and Dark, wired into Tailwind utilities.',
        'Light Mode: inputs/textareas use a light background with dark text; layout cards and modals use semantic surfaces instead of hardcoded slate utilities.',
        'Module tags and timetable badges use `bg-primary/10` / `bg-secondary` for readable contrast in both themes; code snippets stay muted-surface + foreground.',
        'Bottom nav and sticky chrome blur docks track `--background` so translucent bars stay correct when toggling themes.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.7.5.',
      ],
    },
    {
      version: 'v3.7.4',
      date: 'September 2026',
      title: 'Mobile UI/UX master refactor',
      highlights: [
        'Z-index scale: sticky (10) → bottom nav (20) → floating widgets (30) → backdrops (40) → drawers (50) → toasts (60).',
        'Floating Pomodoro + Quick FAB sit clear of the bottom nav; both hide with the nav when the soft keyboard / text focus is open.',
        'FAB speed dial uses a blurred backdrop and locks background scroll while expanded.',
        'Toasts are a singleton banner at the top (under the header), auto-dismiss in 2s — no more bottom-left stacks over study actions.',
        'Smart Notes / Exam Simulator / Code Lab: sticky keyboard-aware primary CTAs (44px) + 16px inputs on mobile to stop iOS zoom.',
        'Code Lab / markdown code blocks: horizontal scroll with min-width pre so line numbers never wrap into code.',
        'sanitizeDeckTitle strips markdown dash artifacts; module badges / tags truncate at 180px with flex-wrap.',
        'Bottom nav home-indicator padding + ≥44px touch targets; drawer / modal body scroll lock retained.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.7.4.',
      ],
    },
    {
      version: 'v3.7.3',
      date: 'September 2026',
      title: 'Longer, more natural soundscapes',
      highlights: [
        'Focus Timer / Pomodoro: ambient engine rebuild — ~22–30s stereo noise beds, dual-rate drifting layers (composite loops sync on the order of minutes, not seconds), and no edge-fade “whoosh” every loop.',
        'Richer textures on every preset (Soft White, Brown, Rain, Ocean, Forest Canopy, Cafe Murmur, Fireplace, Quiet Library, Lofi, Binaural): filter + gain modulation, wider stereo image, and more realistic one-shots (rain drips, bird phrases, cup clinks, ember pops, page rustles, vinyl dust).',
        'Mute, volume slider, and mobile AudioContext unlock behavior are unchanged — same picker options.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.7.3.',
      ],
    },
    {
      version: 'v3.7.2',
      date: 'September 2026',
      title: 'Richer Pomodoro soundscapes',
      highlights: [
        'Focus Timer / Pomodoro: existing ambient presets are softer and more natural — longer noise loops, pink noise, gentler filters, and smoother levels (less harsh hiss).',
        'New soundscapes: Forest Canopy, Cafe Murmur, Fireplace, and Quiet Library — still generated in-browser with Web Audio (no large audio assets).',
        'Mute, volume slider, and mobile AudioContext unlock behavior are unchanged.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.7.2.',
      ],
    },
    {
      version: 'v3.7.1',
      date: 'September 2026',
      title: 'Seamless scrollbars',
      highlights: [
        'UI: scrollbars are hidden app-wide (Overview agenda lists, page scroll, Modules tabs, drawers, modals) while scrolling and horizontal pan still work.',
        'Touch / desktop / PWA: Firefox, Chromium, and legacy Edge scrollbar chrome suppressed via a shared stylesheet rule — no feature loss.',
        'Flashcards: Browse / Recall mode bar uses equal-width segments (no empty left gap under Due Today / All).',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.7.1.',
      ],
    },
    {
      version: 'v3.7.0',
      date: 'September 2026',
      title: 'Snappy load · local-first Timetable, Modules & Tasks',
      highlights: [
        'Instant feel: Timetable, Modules, and Tasks paint from local cache first, then refresh in the background (stale-while-revalidate).',
        'Navigation: Overview / Timetable / Modules stay mounted after first visit so switching tabs no longer remounts and refetches from empty.',
        'PWA boot: themed splash + shell background before React paints to soften white flash and chrome pop-in.',
        'Bundle: heavy study routes (Quiz, Code Lab, Smart Notes, Tutor, Grades, ATU calendar) load on demand without changing the UI.',
        'Reliability: shared fetch dedupe for modules/tasks, Quick Actions uses cached timetable metrics, Timetable no longer flashes “No Timetable Synced” while loading.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.7.0.',
      ],
    },
    {
      version: 'v3.6.6',
      date: 'September 2026',
      title: 'Reset-link no dashboard flash',
      highlights: [
        'Password reset: “request a new link” awaits sign-out and clears session before leaving the recovery screen, so AuthModal opens on landing with no dashboard flash.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.6.6.',
      ],
    },
    {
      version: 'v3.6.5',
      date: 'September 2026',
      title: 'Reset-link and auth-error polish',
      highlights: [
        'Password reset: requesting a new link from an invalid/expired reset screen signs out a leftover normal session first so the forgot-password modal opens instead of dropping into the app.',
        'Auth redirects: hash/query errors only open the expired-reset screen on `/reset-password` or `type=recovery`; other failures (for example cancelled GitHub sign-in) open the sign-in modal with the error.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.6.5.',
      ],
    },
    {
      version: 'v3.6.4',
      date: 'September 2026',
      title: 'Password reset requires recovery session',
      highlights: [
        'Password reset: the set-new-password form only unlocks after a genuine Supabase PASSWORD_RECOVERY session from the email link.',
        'Opening `/reset-password` with a normal signed-in session or an expired/invalid link shows an expired state, with Back to Fios and a way to request a new link.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.6.4.',
      ],
    },
    {
      version: 'v3.6.3',
      date: 'September 2026',
      title: 'Sign-in cleanup + password reset',
      highlights: [
        'Sign-in: Google and Apple continue options removed — email/password and GitHub remain.',
        'Forgot password: request a Supabase reset email from the sign-in box; open the link to set a new password on `/reset-password`.',
        'Forgot email: clear guidance when you cannot remember the address (try reset on likely emails, GitHub if you used it, or contact support).',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.6.3.',
      ],
    },
    {
      version: 'v3.6.2',
      date: 'September 2026',
      title: 'Class reminders include room',
      highlights: [
        'Class reminders: when your timetable entry has a room or location (for example GA 0995), the upcoming-class notification title and body include it. Missing rooms are omitted.',
        'Remind-before timing is unchanged (5 / 10 / 15 / 30 minutes). Re-sync or re-import your timetable if an older cache was missing LOCATION.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.6.2.',
      ],
    },
    {
      version: 'v3.6.1',
      date: 'September 2026',
      title: 'Reliability maintenance + version alignment',
      highlights: [
        'Reliability maintenance: clearer cloud directory listing when schema policies need repair, with an optional SQL script and PostgREST schema reload so signed-in profile rows stay visible across accounts.',
        'Optional SQL: run supabase/v3.6.1-user-profiles-directory.sql then reload the PostgREST schema cache.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.6.1.',
      ],
    },
    {
      version: 'v3.6.0',
      date: 'September 2026',
      title: 'Module exam date & time + semver changelog',
      highlights: [
        'Modules: Create and Edit Academic Module include Exam date & time (mobile-friendly datetime picker + Clear). Saved values drive Overview “Exam & submission countdown” and Revision Flight Plan.',
        'Soft-empty fix: `modules.exam_date` already existed but was never wired into the form — countdown empty state (“Set an exam date on a module…”) now has a real input path.',
        'Optional SQL: run supabase/v3.6.0-module-exam-datetime.sql then reload the PostgREST schema cache so exam_date is timestamptz (upgrades legacy date-only columns).',
        'Changelog: public Updates + README remapped to coherent semver from the first published release as v1.0.0 (substance-based majors/minors/patches).',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.6.0.',
      ],
    },
    {
      version: 'v3.5.4',
      date: 'September 2026',
      title: 'Timetable times match ATU wall clock',
      highlights: [
        'Fix: iCal / Timetable class times no longer show one hour ahead of the official ATU timetable (timetables.atu.ie) during Irish Summer Time. Feed wall-clock times (floating or UTC-Z with local digits) are kept as local hours instead of being treated as UTC then shifted to Ireland.',
        'Sync: re-fetch / re-import rewrites the local and cloud events cache with corrected times — open Timetable or tap sync once after updating.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.5.4.',
      ],
    },
    {
      version: 'v3.5.3',
      date: 'September 2026',
      title: 'Timetable cloud sync recovers after pause',
      highlights: [
        'Fix: timetable / iCal cloud sync no longer stays permanently dead after a missing calendar_state table or schema-cache error (v3.5.1 over-paused pushes). Fios re-probes on a short cooldown, on reconnect, and after a successful select/upsert — sync resumes once the SQL exists or the network returns.',
        'Clear UX: one banner naming supabase/v3.1.9-calendar-state.sql + PostgREST reload; local timetable and offline-first queue still work while cloud is paused.',
        'Reconcile: empty newer cloud rows no longer wipe a populated local events cache; sticky schemaMissing from older clients is treated as expired so the first load can recover.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.5.3.',
      ],
    },
    {
      version: 'v3.5.2',
      date: 'September 2026',
      title: 'Contribution heatmap mobile / PWA fix',
      highlights: [
        'Contribution heatmap: fluid cell sizing on phones so the strip fits the card (no clip under overflow-x-hidden); clearer empty-day borders and tap hit targets.',
        'Touch / installed PWA: day cells use tap-friendly touch-action (no pan-x steal); tap still shows date + focus/reviews detail under the grid.',
        'Data loading: prefer local auth session for focus sessions (works on cold start / flaky mobile); re-fetch when session restores and after Pomodoro completes; retry on load error.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.5.2.',
      ],
    },
    {
      version: 'v3.5.1',
      date: 'September 2026',
      title: 'Offline sync banner no longer spins forever',
      highlights: [
        'Fix: the floating “Syncing N offline changes…” pill no longer sticks or flickers when timetable cloud sync cannot land (for example if supabase/v3.1.9-calendar-state.sql was not applied yet).',
        'Offline queue: duplicate calendar upserts coalesce to one entry; permanent schema/table errors dequeue and show a single clear message instead of retry spam; transient failures use exponential backoff.',
        'Local timetable / iCal cache still works when cloud sync is paused. (v3.5.3 makes auto-resume reliable after the SQL is applied.)',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.5.1.',
      ],
    },
    {
      version: 'v3.5.0',
      date: 'September 2026',
      title: 'Mobile nav hold-to-reorder + Timetable rename',
      highlights: [
        'Mobile: long-press a bottom-nav tab, then drag to reposition — order persists via localStorage / profile prefs (same Settings mobile slots). Haptic + lift feedback when supported; tap still navigates normally.',
        'Mobile drawer: long-press and drag up/down to reorder the full nav list (same order as the desktop sidebar).',
        'Renamed user-facing “Schedule” → “Timetable” (nav label, Smart Quick action, landing/privacy copy, timetable view eyebrow). Route id stays `schedule` so bookmarks and deep links keep working.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.5.0.',
      ],
    },
    {
      version: 'v3.4.0',
      date: 'September 2026',
      title: 'Gemini guidance, push fix, iCal offline sync & maintenance',
      highlights: [
        'Reliability maintenance: clearer cloud error handling for durable data writes (including feedback delete) and version chrome alignment across the app.',
        'Gemini locked screens: clearer step-by-step how to get a key in Google AI Studio, paste it in Settings (or the unlock modal), and why AI features stay blocked without a BYO key (privacy + your quota).',
        'When free-tier Gemini feels slow or times out (“taking a long time”, 429s, quotas), Fios shows a helpful prompt explaining rate limits, shared quota, cold starts, and lower priority — plus how a paid Gemini API key usually speeds things up (higher quotas, fewer timeouts) with links to AI Studio, billing, and rate-limit docs.',
        'Class Reminders: push notifications now display when the server sends a Web Push — the service worker handles push events and notification taps (open/focus Fios). Clearer Settings messages if notifications are blocked, unsupported, or need Add to Home Screen on iPhone/iPad. If you previously enabled reminders, toggle off/on once (or tap Send test notification) so the subscription refreshes.',
        'Timetable / iCal: feed URL, sync status, and last-imported events persist locally first, then sync to your account when the network is available. While offline, timetable changes queue and flush on reconnect; Overview and Timetable can still show your last cached classes.',
        'Optional SQL: run supabase/v3.1.9-calendar-state.sql then reload the PostgREST schema cache so calendar state persists in the database.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.4.0.',
      ],
    },
    {
      version: 'v3.3.0',
      date: 'September 2026',
      title: 'St Patrick ambience fix + birthday theme',
      highlights: [
        'St Patrick’s Day: festive shamrock / rainbow / leprechaun / pot-of-gold background motifs animate clearly again — gold-forward colors and sustained float motion instead of near-invisible sparkles on emerald chrome.',
        'Birthday: add your birthday in Settings → Profile. On that day Overview greets you with “Happy Birthday, {name}” and applies a coral–gold–teal festive gradient with party / cake / balloon ambience.',
        'Optional SQL: run supabase/v3.1.8-user-birthday.sql then reload the PostgREST schema cache so birthday saves persist.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.3.0.',
      ],
    },
    {
      version: 'v3.2.5',
      date: 'September 2026',
      title: 'Smart Notes save success path',
      highlights: [
        'Smart Notes: Summarize & Save with General / no module no longer leaves a cloud-save-failed banner when the document was written — recovers from Postgres not-null (23502) on module_code / summary / legacy body columns and from empty INSERT RETURNING.',
        'Client still sends module_code as an empty string (never null); cloud-failure copy names the rejected column only when cloud write truly fails after retries.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.2.5.',
      ],
    },
    {
      version: 'v3.2.4',
      date: 'September 2026',
      title: 'Modules tab strip scroll on mobile',
      highlights: [
        'Modules: on phones, swipe/scroll the Decks · MCQ Quizzes · Code Exams · Tasks · Documents tab strip horizontally so tabs past the edge (including Documents) are reachable.',
        'Active tab scrolls into view when selected; desktop tab layout unchanged.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.2.4.',
      ],
    },
    {
      version: 'v3.2.3',
      date: 'September 2026',
      title: 'Smart Notes General module save',
      highlights: [
        'Smart Notes: Summarize & Save with General / no module no longer fails with Postgres 23502 (module_code not-null) — client sends empty string instead of null.',
        'Optional SQL: run supabase/v3.1.5-documents-module-code.sql then reload the PostgREST schema cache so live DBs drop NOT NULL on module_code and default to \'\'.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.2.3.',
      ],
    },
    {
      version: 'v3.2.2',
      date: 'September 2026',
      title: 'Smart Notes load fix',
      highlights: [
        'Smart Notes: documents list surfaces the real PostgREST error instead of a silent empty load after the consolidated Supabase schema.',
        'Client select/upsert/parse aligned with documents.content + summary (not null default \'\'), glossary jsonb, module_code, and title; hardened glossary JSON parsing.',
        'Optional SQL: run supabase/v3.1.4-documents-load.sql then reload the PostgREST schema cache if notes still fail to load.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.2.2.',
      ],
    },
    {
      version: 'v3.2.1',
      date: 'September 2026',
      title: 'Mobile version badge + Smart Notes schema',
      highlights: [
        'Mobile top bar: version badge stays visible beside the Fios logo on narrow phones — compact logo sizing so it no longer disappears under header controls.',
        'Smart Notes: Summarize & Save aligns with documents.glossary, summary, and content columns; clearer message when the Supabase schema cache is stale, with local save fallback.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.2.1.',
      ],
    },
    {
      version: 'v3.2.0',
      date: 'September 2026',
      title: 'Holiday motifs, Brain Dump toggle & mobile nav swipe',
      highlights: [
        'Mobile: swipe from the left edge (or a clear rightward swipe on content) opens the navigation drawer — vertical scroll still wins.',
        'Desktop flashcards: swipe-to-rate gestures and “swipe Easy/Hard” hints are touch/mobile only; PC keeps click-to-flip, Previous/Next, and SM-2 rating buttons.',
        'Brain Dump inbox is toggleable in Settings alongside Pomodoro and Smart Quick — desktop (≥768px) defaults On, mobile defaults Off; desktop and mobile choices stay independent.',
        'When enabled on desktop, Brain Dump stays in the shared floating dock beside Pomodoro and Quick Widget.',
        'Holiday background animations use clearer seasonal icons: Halloween skulls (plus ghost/ember/bat vibes — no candy canes), St Patrick’s Day shamrocks, rainbows, leprechauns & pot of gold, Easter bunnies, eggs & stars.',
        'Christmas holly / snow / candy cane motifs unchanged; accent gradients and color washes kept.',
        'Landing marketing stays default emerald; reduced-motion and Low-Power still show a static wash only.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.2.0.',
      ],
    },
    {
      version: 'v3.1.1',
      date: 'September 2026',
      title: 'Desktop widgets hotfix + festive holiday visuals',
      highlights: [
        'Desktop: Pomodoro floating widget and Smart Quick Widget default ON when you have not toggled them on desktop (viewport ≥768px).',
        'Mobile: both still default OFF until toggled in Settings — desktop and mobile choices are now independent, so a phone session no longer leaves desktop stuck Off.',
        'Holiday themes keep their accent gradients and add festive icons in app chrome (ghost / tree / shamrock / egg motifs) when a holiday theme is active.',
        'Clearer holiday backgrounds and animations layered on those gradients: Halloween embers, Christmas snowfall, St Patrick’s sparkles, Easter pastel floaters.',
        'Ambience follows calendar day-auto themes; landing marketing stays default emerald.',
        'Respects prefers-reduced-motion and Low-Power mode (static wash only / particles off).',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.1.1.',
      ],
    },
    {
      version: 'v3.1.0',
      date: 'September 2026',
      title: 'Study polish — ambience, widgets, schedule, modules & PWA',
      highlights: [
        'Desktop: Pomodoro floating widget and Smart Quick Widget default ON again when you have not toggled them in Settings (viewport ≥768px).',
        'Mobile: both floating widgets still default OFF until explicitly toggled (`floatingWidgetsExplicit` from v2.5.2) — intentional Settings choices stay saved.',
        'Brain Dump inbox: re-laid out in the shared FAB dock beside Pomodoro + Quick Widget — opens upward alongside them without covering the FAB or fighting mobile bottom nav.',
        'OpenDyslexic: self-hosted woff faces with font-display:swap; applies on iOS Safari, Android Chrome, and installed PWA (standalone) — no broken CDN stylesheet.',
        'OpenDyslexic overrides Tailwind chrome fonts so the accessibility setting is visible across the UI; true code samples stay monospace.',
        'Holiday themes gain subtle atmospheric backgrounds when active: soft color washes plus sparse motion that stays readable for study.',
        'Halloween: soft orange/purple wash with faint floating ember motes.',
        'Christmas (Eve–St Stephen’s / Dec 24–26): soft red/green holly wash with very light snowfall.',
        'St Patrick’s Day: soft green & gold shimmer with sparse sparkles.',
        'Easter: soft pastel lilac/blush/sky wash with gentle floating dots.',
        'Ambience follows the active holiday theme (calendar day or when a holiday theme is selected); landing marketing stays default emerald.',
        'Respects prefers-reduced-motion and Low-Power mode (static wash only / particles off).',
        'Smart Notes: resilient save when `documents.content` is missing or PostgREST schema cache is stale — clearer reload hint, legacy body/text/notes read alignment, and IndexedDB local fallback so Summarize isn’t a dead end.',
        'Schedule month view (mobile): larger day cells and tap targets, clearer hierarchy for today / selected / days with classes, event color dots (muted = finished) instead of cramped truncated titles, short weekday headers, and no horizontal overflow — tap a day for full class titles.',
        'Schedule controls: Day / Week / Month toggles and prev/next/Today hit areas sized for touch; desktop month pill stack and layout unchanged.',
        'Finished-class muting and Next Up highlight from earlier releases are preserved in day, week, and month views.',
        'Compact agenda titles slightly larger on small screens for easier scanning.',
        'Weekly Study Goal: full-width progress strip on Overview under the greeting (desktop + mobile) — live hours toward your focus target with quick edit; Settings still edits the same weekly target.',
        'Grade Predictor: Save assessments works again on live — maps legacy Supabase column names and shows a clear error toast if save fails (number formatting from v3.0.0 unchanged).',
        'Modules: clear Edit (pencil) on each module card — update name, optional course code, accent color, and folder tags; blank codes stay blank in the UI.',
        'Badges & selectors: decks, quizzes, exams, documents, tasks, pickers, heatmaps, GPA, and agenda labels prefer the module name over course-code shorthand.',
        'Contribution heatmap: mobile-friendly grid with horizontal touch scroll, month/day labels, tap-a-cell activity detail, and a shorter default window (last 16 weeks).',
        'PWA & web: in-app “Update available” prompt with Reload when a new service worker is ready (respects reduced motion).',
        'Mobile top bar: version badge visible beside the logo.',
        'Quick Nav: ⌘K / Ctrl+K reliably opens the same command palette as the header chip (capture-phase + preventDefault); ignored while typing in inputs.',
        'Privacy & Terms refresh: clearer disclosures for Feedback & Ratings (what’s collected, anonymous vs signed-in, purpose, retention, who receives it) plus Contact Support, study data, BYO Gemini / multimodal uploads, Web Push, local/PWA storage, and an explicit no ad-tracker / no analytics-SDK statement — aligned with v3.0.0 push + upload language.',
        'Version alignment: packages, HTML title, Updates tab, README, and API `/health` report v3.1.0.',
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
      version: 'v2.5.2',
      date: 'September 2026',
      title: 'Mobile widgets OFF + drawer scroll lock',
      highlights: [
        'Mobile: Quick Widget FAB and Pomodoro floating widget now reliably default OFF when the user has not toggled them in Settings — including for returning users whose prefs still had the old baked-in `true` defaults.',
        'Adds `floatingWidgetsExplicit` so intentional Settings toggles are preserved; profile sync no longer re-enables widgets from legacy remote prefs.',
        'Desktop viewport defaults stay ON until the user changes them; Reset Preferences returns to viewport-aware defaults.',
        'Mobile nav drawer: background page scroll is locked while the drawer/overlay is open (body position fixed + touchmove blocked on backdrop); scroll position restored on close. Drawer panel itself still scrolls.',
        'Version alignment: packages, HTML title, Updates tab, and README report v2.5.2.',
      ],
    },
    {
      version: 'v2.5.1',
      date: 'September 2026',
      title: 'Logo & PWA icon polish',
      highlights: [
        'In-app Fios mark: rebalanced `</>` proportions — wider optical balance, even gaps between `<` `/` `>`, comfortable padding inside the square, slightly more space before the wordmark.',
        'PWA / Add to Home Screen / Apple touch: regenerated white `</>` on solid black with ~18–22% inset (centered, not tall-stretched or edge-cramped); apple-touch 180×180, 192/512, maskable, and favicon share the same geometry.',
        'Header logo → Overview and landing emerald brand lock unchanged from v2.5.0.',
        'Version alignment: packages, HTML title, Updates tab, and README report v2.5.1.',
      ],
    },
    {
      version: 'v2.5.0',
      date: 'September 2026',
      title: 'Mobile widget defaults, SM-2 previews & brand polish',
      highlights: [
        'Mobile: Quick Widget FAB and Pomodoro floating widget default OFF for new users / unsaved prefs; explicit saved prefs are preserved. Desktop defaults unchanged.',
        'SM-2 rating buttons: Again / Hard / Good / Easy previews differentiate meaningfully (e.g. new cards ~1m / ~10m / 1d / 4d) and match the schedule written on rate; Active Recall Reveal-before-grade unchanged.',
        'Landing / logged-out marketing: locked to default emerald brand + dark chrome — ignores saved Settings accent and Light/System remaps (in-app theme/accent unchanged).',
        'Logo mark: decorative orbit dots / frame removed — in-app `</>` only. PWA / Apple touch icons rebuilt as larger white `</>` on solid black (no border chrome); apple-touch 180×180 + 192/512/maskable refreshed.',
        'Command palette: ⌘K / Ctrl+K reliably opens the same palette as the header ⌘ K chip (capture-phase handler so browser search bindings do not steal it).',
        'Smart Quick Widget: Zen / Deep Focus available in the action catalog (toggle enter/exit); mobile Quick Widget still defaults off.',
        'Version alignment: packages, HTML title, Updates tab, and README report v2.5.0.',
      ],
    },
    {
      version: 'v2.4.0',
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
        'Version alignment: packages, HTML title, Updates tab, and README report v2.4.0.',
      ],
    },
    {
      version: 'v2.3.1',
      date: 'September 2026',
      title: 'Nav chrome polish & agenda by due date',
      highlights: [
        'Header hamburger / X restyled to match the top bar — same size, radius, and accent border as neighbouring chrome controls, vertically aligned with the Fios logo; toggle behaviour unchanged.',
        'Compact agenda / unified timeline: timed tasks sort and appear by due date (not start), so deadlines land on the correct calendar day alongside classes.',
        'Agenda date headers: Today / Tomorrow / weekday groups so classes and tasks sit under clear calendar days instead of a flat undated list.',
        'Overview Focus card: no more “You’re all caught up” flash while tasks are still loading — shows a loading state until the real pending count arrives.',
        'ATU Academic Calendar: stripped leftover `[cite: N]` citation markers from key-date descriptions so copy renders cleanly.',
        'Mobile polish: Focus/agenda/header wrap without overflow; bottom nav scrollable; Schedule institution field full-width on small screens; ATU filter chips typed as buttons.',
        'Version alignment: packages, HTML title, Updates tab, and README report v2.3.1.',
      ],
    },
    {
      version: 'v2.3.0',
      date: 'September 2026',
      title: 'Nav toggle, task dates, support send & landing refresh',
      highlights: [
        'Header menu (hamburger / X) beside the Fios logo toggles the mobile drawer and the desktop sidebar; drawer sits below the header so the toggle always stays clickable.',
        'Task create Start / Due fields use a reliable datetime-local control (theme-aware color-scheme + open-picker button) that updates state and saves timed agenda tasks.',
        'Contact Support: keep showing the support inbox (`VITE_SUPPORT_EMAIL` or oryn02@gmail.com); add an in-app message form that POSTs to `/api/support` and emails the inbox via Resend/SendGrid when configured — clear error if the provider key is missing (no crash). Mailto remains optional.',
        'Landing page refresh: brand-first hero, schedule/agenda, study hubs, AI Tutor, SM-2 flashcards, Smart Notes, Code Lab, themes, PWA, and privacy/legal links — purposeful motion, responsive, aligned with the emerald/teal Fios identity.',
        'Version alignment: packages, HTML title, Updates tab, and README report v2.3.0.',
      ],
    },
    {
      version: 'v2.2.0',
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
        'Version alignment: packages, HTML title, Updates tab, and README all report v2.2.0. Builds on v2.1.0 Render/Zen/widget work without regressing Bugbot fixes.',
      ],
    },
    {
      version: 'v2.1.0',
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
      version: 'v2.0.0',
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
      version: 'v1.1.0',
      date: 'September 2026',
      title: 'Timetable Proxy & Interactive Month Grid',
      highlights: [
        'Implemented local Express server proxy (port 5000) to bypass ATU CORS restrictions and feed synchronization blocks.',
        'Added fully interactive Month, Week, and Day calendar views with seamless date navigation controls.',
        'Upgraded SM-2 flashcard deck persistence layer with robust Supabase field mapping.',
      ],
    },
    {
      version: 'v1.0.0',
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
    <div className="space-y-6 max-w-4xl mx-auto font-sans text-foreground">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-black uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" />
          SYSTEM CHANGELOG
        </div>
        <h1 className="text-3xl font-black italic uppercase text-foreground tracking-tight">Fios Updates</h1>
        <p className="text-xs font-mono text-muted-foreground">Current release · v4.1.0</p>
      </header>

      <div className="space-y-4">
        {releases.map((rel, idx) => (
          <div key={rel.version} className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm dark:shadow-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border/80">
              <div className="flex items-center gap-3">
                <span className="bg-emerald-400 text-slate-950 font-mono font-black text-xs px-2.5 py-1 rounded-md uppercase">
                  {rel.version}
                </span>
                <h3 className="text-base font-black text-foreground italic tracking-wide">{rel.title}</h3>
              </div>
              <span className="text-xs font-mono text-muted-foreground font-bold">{rel.date}</span>
            </div>

            <ul className="space-y-2.5">
              {rel.highlights.map((point, pIdx) => (
                <li key={pIdx} className="flex items-start gap-2.5 text-xs font-mono text-foreground leading-relaxed">
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
