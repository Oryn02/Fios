# Fios — Your Academic Command Center

[![Version](https://img.shields.io/badge/version-v3.7.6-059669)](https://github.com/Oryn02/Fios)

> **Fios is a test application, created end-to-end using AI tools — specifically Google's Gemini API and [Cursor](https://cursor.com) (Agent Mode).** It was built to explore how far agent-driven development can take a real, full-stack study platform. Treat it as a reference/demo project rather than a production service.

**Current version: v3.7.6**


> Version numbers in Updates / README use coherent semver from the first published release as **v1.0.0** (reassigned by substance; SQL migration filenames on disk may still use older labels).

Fios turns raw lecture notes into **SM-2 spaced-repetition flashcards, MCQ quizzes, Monaco-powered code exams, and an AI tutor**, wrapped in a modern dashboard with a global Pomodoro timer, a grade predictor, and a module-readiness heatmap.

---

## Highlights

- **SM-2 Flashcards** — AI-generated decks with differentiated Again/Hard/Good/Easy interval previews (learning steps in minutes), local-day due dates, touch swipe Easy/Hard on mobile, first-time SM-2 tip, and deck export/import (JSON + share code).
- **MCQ Quiz Generator** — practice exams with explanations, saved per module; choose 5 / 10 / 20 / 40 questions.
- **Monaco Code Exams** — bug-fix, output-prediction, and logic-completion challenges with optional custom prompts.
- **Smart Notes & AI Tutor** — upload PDFs/notes/photos/audio for summaries, glossaries, revision history, and a dedicated full-screen tutor tab (RAG-aware + multimodal).
- **AI Active Recall ("Blurting")** — Browse vs Recall modes; quiz answer hidden until Reveal; Gemini color-coded report + Recall Accuracy %.
- **Revision Flight Plan** — dashboard queue prioritized by exam proximity, overdue SM-2 cards, and readiness (modular / reorderable widgets); smart Review/Run routing.
- **Grade Predictor** — computes the scores you need across assessments; semester GPA vs honours thresholds.
- **Module Readiness Heatmap** — 0–100% readiness per module with calculation breakdown; rich module accent colors on badges/tags/heatmap.
- **Study streak heatmap & exam countdown** — contribution grid from focus + flashcard reviews; live countdown to exams and due tasks.
- **Brain Dump inbox** — floating quick-capture with optional AI parse into tasks (Settings toggle; desktop On / mobile Off by default, like Pomodoro / Quick Widget).
- **Class Reminders** — optional browser notifications (5–30 min lead) for upcoming classes, including the room/location when the timetable has one (for example GA 0995); Web Push when VAPID is configured (service worker shows notifications + opens Fios on tap).
- **Universal timetable** — iCal sync or manual timetable for any college; offline-first feed URL / sync status / event cache with cloud reconcile when online; iCal helper + clearer errors; finished classes muted; Next Up highlight; mobile month view with larger taps and clearer day hierarchy.
- **Unified agenda** — classes + timed tasks on a calendar-day timeline (memoized CompactAgenda); tasks sort by due date; start/due datetime pickers update and save.
- **Holiday greetings & day-only themes** — Overview holiday greetings and temporary accent palettes on key dates (Christmas Eve–26 window), birthday greeting + theme when you set your birthday, plus subtle festive ambience (washes / sparse motion) when those themes are active; landing stays emerald.
- **Contact Support** — in-app message form posts to the API and emails the support inbox (Resend/SendGrid when configured); mailto remains optional.
- **Feedback & ratings** — optional star rating, categories, and message (anonymous submit supported).
- **Privacy & GDPR** — in-app Privacy Policy + Terms (landing footer and Settings); disclosures for Web Push, multimodal uploads, Supabase, Gemini (BYO key), optional GitHub, and hosting; Export My Data (JSON).
- **Global Pomodoro Timer** — floating dock widget with Web Audio soundscapes and Weekly Study Goal (defaults off on mobile until enabled in Settings; legacy baked-on prefs migrated).
- **Smart Quick Widget** — expanded actions, custom order, compact FAB, metrics chip (defaults off on mobile until enabled; legacy baked-on prefs migrated).
- **Themes** — Dark / Light / System with semantic CSS tokens (`background`, `foreground`, `card`, `primary`, …), accent gradients, Low-Power mode, Zen focus (Esc / Exit Zen / mobile escape), OpenDyslexic. Landing marketing stays locked to default emerald.
- **Nav customization** — header hamburger toggles mobile drawer and desktop sidebar (compact chrome control, larger Fios wordmark; logo opens Overview); reorder desktop sidebar (drag or Settings); long-press mobile bottom tabs (and drawer items) to drag-reorder; add/hide slots in Settings (persisted prefs); sticky mobile header.
- **Mermaid + Markdown + LaTeX** — diagrams, GFM markdown, and KaTeX math in AI content.
- **Command palette** — Ctrl/Cmd+K fuzzy navigation; cookie consent + Terms of Service; refreshed landing (tighter hero + study hubs + FAQ).
- **Mobile study upload** — PDF / TXT / images (iPhone Photos + Android); server PDF extract for iOS Files picker; Vision multimodal for photos.
- **PWA** — installable standalone app (apple-touch 180×180, 192/512, maskable — white `</>` on solid black) via VitePWA + Workbox; offline mutation queue (IndexedDB) + network indicator.
- **Render hosting** — Express Web Service (`server/` / fios-api) + Static Site (`client/` / fios-web); client calls API via `VITE_API_URL`.

### What’s new in v3.7.5

- Theme Engine: semantic Light/Dark CSS variables wired into Tailwind (`bg-background`, `text-foreground`, `bg-card`, `bg-primary/10`, …).
- Light Mode: inputs and textareas render light surfaces with dark text; primary layout cards and modals drop hardcoded slate utilities.
- Module tags / timetable badges use `bg-primary/10` and `bg-secondary` for contrast in both themes; code snippets stay readable on muted surfaces.
- Bottom navigation and sticky chrome blur docks track `--background` when toggling themes.
- Version alignment across packages and API `/health`.

### What’s new in v3.7.4

- Mobile UI/UX master refactor: strict z-index scale so Pomodoro / FAB / bottom nav / drawers / toasts no longer collide.
- Floating widgets clear the bottom nav and auto-hide when the keyboard or a text field is focused; FAB speed dial uses a backdrop + scroll lock.
- Toast singleton at the top of the viewport (2s dismiss) — rating toasts no longer stack over bottom chrome.
- Sticky keyboard-aware action bars + 16px inputs on Smart Notes, Exam Simulator, and Code Lab; code blocks scroll horizontally without wrapping line numbers.
- Deck title sanitization and truncated module badges/tags; bottom nav safe-area padding and 44px touch targets.

- Version alignment across packages and API `/health`.

### What’s new in v3.7.3

- Pomodoro soundscapes: substantially longer seamless loops (~22–30s stereo beds + dual-rate drift) so repetition is far less obvious.
- Richer, more natural textures across all presets (existing + Forest / Cafe / Fireplace / Library) via filter modulation, layering, and varied one-shots — less “synth hiss / short tape loop.”
- Mute / volume controls and mobile AudioContext unlock patterns unchanged.
- Version alignment across packages and API `/health`.

### What’s new in v3.7.2

- Pomodoro soundscapes: softer, more natural procedural Web Audio presets (longer loops, pink noise, gentler filters/levels).
- New ambient options: Forest Canopy, Cafe Murmur, Fireplace, Quiet Library — still zero audio asset files.
- Mute / volume controls and mobile AudioContext unlock patterns unchanged.
- Version alignment across packages and API `/health`.

### What’s new in v3.7.1

- Seamless scrollbars: hide scrollbar indicators app-wide (Overview agenda / timeline lists, page scroll, Modules tabs, drawers, modals) while keeping scroll and horizontal pan.
- Shared stylesheet rule for overflow areas (Firefox / Chromium / legacy Edge); desktop + mobile / PWA.
- Flashcards: Browse / Recall mode bar uses equal-width segments (no empty left gap under Due Today / All).
- Version alignment across packages and API `/health`.

### What’s new in v3.7.0

- Local-first paint for Timetable, Modules, and Tasks: show cached data immediately, then refresh in the background.
- Hot tabs (Overview / Timetable / Modules) stay mounted after first visit for instant navigation without empty remounts.
- PWA boot splash + themed shell background before React paints; heavy study routes code-split on demand.
- Shared modules/tasks cache with fetch dedupe; Quick Actions uses cached timetable metrics; Timetable loading no longer flashes empty.
- Version alignment across packages and API `/health`.

### What’s new in v3.6.6

- Password reset: “request a new link” awaits sign-out and clears session before leaving the recovery screen, so the forgot-password modal opens on landing with no dashboard flash.
- Version alignment across packages and API `/health`.

### What’s new in v3.6.5

- Password reset: requesting a new link from an invalid/expired reset screen signs out a leftover normal session first so the forgot-password modal opens on the landing page.
- Auth redirects: URL `error` / `error_description` only drive the expired-reset screen on `/reset-password` or `type=recovery`; other failures (for example cancelled GitHub sign-in) open the sign-in modal with the error instead.
- Version alignment across packages and API `/health`.

### What’s new in v3.6.4

- Password reset: the set-new-password form only appears after a genuine Supabase `PASSWORD_RECOVERY` session. Opening `/reset-password` while signed in (or with an expired/invalid link) shows an expired state with a way back to Fios.
- Version alignment across packages and API `/health`.

### What’s new in v3.6.3

- Sign-in: Google and Apple continue options removed (email/password + GitHub remain).
- Forgot password: request a reset email from the sign-in box; complete a new password after the Supabase recovery link (`/reset-password`).
- Forgot email: in-app guidance when you cannot remember the address (try likely emails, GitHub if used, or contact support).
- Version alignment across packages and API `/health`.

### What’s new in v3.6.2

- Class reminders: upcoming-class notifications include the room/location when present (for example GA 0995); missing rooms are omitted. Remind-before timing is unchanged.
- Version alignment across packages and API `/health`.

### What’s new in v3.6.1

- Reliability maintenance: clearer cloud directory listing when schema policies need repair, with an optional SQL script and PostgREST schema reload.
- Optional SQL: `supabase/v3.6.1-user-profiles-directory.sql` then reload PostgREST schema cache.
- Version alignment across packages and API `/health`.

### What’s new in v3.6.0

- Modules: Create / Edit Academic Module includes **Exam date & time** (datetime picker). Values drive Overview countdown and Revision Flight Plan.
- Soft-empty fix: `modules.exam_date` existed but was unwired — countdown empty state now has a form path.
- Optional SQL: `supabase/v3.6.0-module-exam-datetime.sql` (timestamptz upgrade) then reload PostgREST schema cache.
- Public Updates + README changelog remapped to coherent semver from first published release as **v1.0.0**.
- Version alignment across packages and API `/health`.

### What’s new in v3.5.4

- Fix: Timetable / iCal class times match the official ATU wall clock (no longer one hour ahead during Irish Summer Time). Feed times are kept as local hours instead of UTC→Ireland shifting.
- Re-sync / reopen Timetable rewrites the cached events with corrected times.
- Version alignment across packages and API `/health`.

### What’s new in v3.5.3

- Fix: timetable / iCal cloud sync no longer stays permanently paused after a missing `calendar_state` table or schema-cache error (v3.5.1 over-blocked pushes). Fios re-probes on a short cooldown, on reconnect, and after a successful select/upsert.
- Clear UX: one banner pointing at `supabase/v3.1.9-calendar-state.sql` + PostgREST reload; local timetable and the offline-first queue keep working while cloud is paused.
- Reconcile: empty newer cloud rows no longer wipe a populated local events cache; sticky `schemaMissing` from older clients is treated as expired so the first load can recover.
- Version alignment across packages and API `/health`.

### What’s new in v3.5.2

- Contribution heatmap (mobile / installed PWA): fluid day-cell sizing so the strip fits the Overview card without being clipped by layout overflow; larger tap targets and visible empty-day borders.
- Touch: day cells prefer tap over horizontal pan so presses register on iOS Safari and standalone PWA; date + activity detail still appears under the grid.
- Data: focus sessions resolve auth from the local session first (cold start / offline-friendly), re-fetch when the session restores and after a Pomodoro completes, with a clear retry on load failure.
- Version alignment across packages and API `/health`.

### What’s new in v3.5.1

- Fix: the floating “Syncing N offline changes…” indicator no longer sticks or keeps counting when timetable cloud sync cannot land (commonly when `supabase/v3.1.9-calendar-state.sql` has not been applied yet).
- Offline queue: calendar upserts coalesce; missing-table / schema-cache errors dequeue with one clear message (local timetable still works); transient failures back off instead of retry-spamming.
- Version alignment across packages and API `/health`.

### What’s new in v3.5.0

- Mobile bottom nav: long-press a tab, then drag to reposition — order persists via localStorage / profile prefs (same Settings mobile slots). Lift + haptic feedback when the device supports it; normal taps still navigate.
- Mobile drawer: long-press and drag up/down to reorder the full nav list (shared with desktop sidebar order).
- User-facing rename: **Schedule → Timetable** (nav label, Smart Quick action, landing/privacy copy, timetable view). Route id stays `schedule` so bookmarks and deep links keep working.
- Version alignment across packages and API `/health`.

### What’s new in v3.4.0

- Reliability maintenance with clearer handling for durable cloud writes (including feedback delete).
- Gemini locked screens: step-by-step how to get a key in [Google AI Studio](https://aistudio.google.com/app/apikey), paste it in Settings (or the unlock modal), and why AI features stay blocked without a BYO key.
- Free-tier latency tips: when Gemini is “taking a long time” / timing out, a clear prompt explains rate limits, shared quota, cold starts, and lower priority — and how a paid Gemini API key usually speeds the app up (higher quotas, fewer 429s/timeouts), with links to AI Studio, [billing](https://ai.google.dev/gemini-api/docs/billing), and [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).
- Class Reminders / Web Push: the service worker now handles push events and notification clicks, so server VAPID deliveries show a notification on supported browsers and installed PWAs. Clearer Settings messaging when notifications are blocked, unsupported, or require Add to Home Screen on iPhone/iPad. Re-subscribes if the VAPID public key changes.
- iCal / timetable: feed URL, sync status, and last-imported events persist locally first, then sync to your account when Wi‑Fi / network is available. Offline changes queue and flush on reconnect; Overview and Timetable can show your last cached timetable while offline.
- Optional SQL: `supabase/v3.1.9-calendar-state.sql` adds `calendar_state` (then reload the PostgREST schema cache).
- Version alignment across packages and API `/health`.

### What’s new in v3.3.0

- St Patrick’s Day ambience: shamrock / rainbow / leprechaun / pot-of-gold motifs animate again with clearer gold–green contrast and sustained float motion (no longer near-invisible sparkles on emerald chrome).
- Birthday: set your birthday in Settings → Profile; on that day Overview greets you with “Happy Birthday, {name}” and a coral–gold–teal festive theme with party / cake / balloon ambience.
- Optional SQL: `supabase/v3.1.8-user-birthday.sql` adds `user_profiles.birthday` (then reload the PostgREST schema cache).
- Version alignment across packages and API `/health`.

### What’s new in v3.2.5

- Smart Notes: Summarize & Save no longer shows a cloud-save-failed banner when the note actually writes (or can write after a not-null retry) — recovers from Postgres 23502 on `module_code` / summary / legacy body columns, and from empty INSERT RETURNING.
- General / no module keeps sending `module_code: ''` (never null); error copy names the rejected column when still needed.
- Version alignment across packages and API `/health`.

### What’s new in v3.2.4

- Modules: mobile tab strip (Decks / MCQ Quizzes / Code Exams / Tasks / Documents) scrolls horizontally so out-of-view tabs like Documents are reachable; desktop layout unchanged.
- Version alignment across packages and API `/health`.

### What’s new in v3.2.3

- Smart Notes: Summarize & Save no longer sends `module_code: null` for General — uses empty string so live DBs with NOT NULL still accept the row.
- Apply `supabase/v3.1.5-documents-module-code.sql` in the Supabase SQL editor (coalesce nulls, drop NOT NULL on `module_code`, default `''`), then reload the PostgREST schema cache.
- Version alignment across packages and API `/health`.

### What’s new in v3.2.2

- Smart Notes: documents list surfaces the real PostgREST error instead of failing silently after the consolidated Supabase schema.
- Client select/upsert/parse aligned with `documents.content` + `summary` (not null default `''`), `glossary` jsonb, `module_code`, and `title`; hardened glossary JSON parsing.
- Apply `supabase/v3.1.4-documents-load.sql` in the Supabase SQL editor, then reload the PostgREST schema cache if notes still fail to load.
- Version alignment across packages and API `/health`.

### What’s new in v3.2.1

- Mobile top bar: version badge stays visible beside the Fios logo on narrow phones (compact logo sizing so it is not lost under header controls).
- Smart Notes: Summarize & Save aligns with `documents.glossary`, `summary`, and `content`; clearer stale-schema-cache guidance; local save fallback when cloud upsert cannot complete.
- Apply `supabase/v3.1.3-documents-columns.sql` in the Supabase SQL editor, then reload the PostgREST schema cache if Summarize still errors.
- Version alignment across packages and API `/health`.

### What’s new in v3.2.0

- Mobile: left-edge (or clear content) swipe-right opens the nav drawer without fighting vertical scroll.
- Desktop flashcards: no swipe-to-rate; swipe Easy/Hard hints are touch/mobile only. Click-to-flip, Previous/Next, and SM-2 buttons stay.
- Brain Dump inbox: Settings toggle beside Pomodoro / Smart Quick — desktop (≥768px) defaults **On**, mobile **Off**; per-viewport explicit flags so mobile Off does not stick on desktop. Enabled desktop dock keeps it beside Pomodoro + Quick Widget.
- Holiday background motifs refined: Halloween skulls (ghost/ember/bat OK — no candy canes), St Patrick’s shamrocks / rainbows / leprechauns / pot of gold, Easter bunnies / eggs / stars.
- Christmas holly / snow / candy cane motifs unchanged; holiday accent gradients and washes kept.
- Landing marketing remains locked to default emerald; reduced-motion and Low-Power unchanged (static wash / particles off).

### What’s new in v3.1.1

- Desktop: Pomodoro + Smart Quick Widget default **On** (≥768px) when you have not toggled them on desktop; mobile still defaults **Off** until toggled in Settings. Desktop and mobile choices are independent (fixes sticky mobile-off sync).
- Holiday themes stay gradient-first: festive icons (ghost/tree/shamrock/egg motifs) plus clearer holiday backgrounds and animations (embers, snowfall, sparkles, pastel floaters) layer **on top of** the existing holiday accent palettes when a day theme is active.
- Landing marketing remains locked to default emerald (no holiday chrome).
- Respects `prefers-reduced-motion` and Low-Power (static wash / particles off).

### What’s new in v3.1.0

- Desktop: Pomodoro + Smart Quick Widget default **On** (≥768px) when unset; mobile still defaults **Off** until toggled in Settings (`floatingWidgetsExplicit`).
- Brain Dump inbox sits in the shared FAB dock beside Pomodoro / Quick Widget — opens upward without covering the FAB or mobile bottom nav.
- OpenDyslexic: self-hosted fonts with `font-display: swap`; works on iOS Safari, Android Chrome, and installed PWA (no broken CDN CSS).
- Holiday theme ambience: soft atmospheric washes and sparse CSS motion for Halloween, Christmas (Dec 24–26), St Patrick’s Day, and Easter when those day-only themes are active — still study-friendly; respects reduced-motion and Low-Power.
- Landing marketing remains locked to default emerald (no holiday chrome).
- Smart Notes reliability: client prefers `documents.content`, maps legacy body/text/notes on read, shows a clear PostgREST schema-cache reload hint, and falls back to IndexedDB so summarize still saves when cloud upsert fails. Re-run the idempotent `documents.content` block in `supabase/schema.sql` and reload schema if the live error persists.
- Mobile schedule readability: month grid with larger tap targets, clearer today / selected / has-events hierarchy, event dots (no cramped truncated titles), and touch-sized Day/Week/Month controls; desktop layout unchanged; finished muting + Next Up preserved.
- Weekly Study Goal on Overview as a full-width progress strip under the greeting (desktop + mobile).
- Grade Predictor: Save assessments works again on live (legacy Supabase column mapping + clear error toast).
- Modules: Edit (pencil) on each card; badges and selectors prefer module **name** over course-code shorthand.
- Contribution heatmap: mobile scroll/layout fix, month/day labels, tap-cell detail; PWA “Update available” reload prompt; mobile version badge.
- Quick Nav: ⌘K / Ctrl+K reliably opens the command palette again.
- Privacy / Terms / cookie copy refreshed for Feedback & Ratings, Contact Support, study data, Gemini uploads, Web Push, and local/PWA storage (no ad trackers; no invented analytics).
- Version alignment across packages and API `/health` for deploy consistency.
- See the in-app **Updates** tab for the full changelog.

### What’s new in v3.0.0

- Major release: multimodal AI Tutor uploads, Class Reminders (Web Push / local), study streak heatmap, exam countdown, Brain Dump inbox, semester GPA, deck export/import, audio/vision Smart Notes, SM-2 onboarding tip, MCQ length 5–40, inline renames, holiday greetings & day-only themes, sticky mobile header, network indicator, iCal helper, and privacy/FAQ updates for push + multimodal.
- Supabase: additive `documents.content` (+ optional `push_subscriptions`) migration in `supabase/schema.sql` — reload PostgREST schema cache after applying.
- Render: set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` for server Web Push (local reminders still work without them).
- See the in-app **Updates** tab for the full changelog (items covering the v3.0.0 feature set).

### What’s new in v2.5.2

- Mobile: Quick Widget FAB + Pomodoro floating widget **reliably default OFF** unless the user has toggled them in Settings (fixes returning users stuck with old baked-in `true` prefs from v2.5.0’s incomplete fix).
- New `floatingWidgetsExplicit` flag distinguishes intentional overrides from system defaults; profile sync no longer re-enables widgets from legacy remote prefs.
- Desktop defaults remain ON; Settings toggles still persist across devices once set explicitly.
- Mobile nav drawer: page scroll locked while open (iOS-safe body lock + backdrop touchmove block); scroll restored on close.
- See the in-app **Updates** tab for the full changelog.

### What’s new in v2.5.1

- Logo polish: in-app `</>` mark rebalanced (wider optical weight, even stroke gaps, comfortable padding, slightly more air before the wordmark).
- PWA / Apple touch / favicon: regenerated white `</>` on solid black with ~18–22% inset — centered, not stretched or edge-cramped (180 / 192 / 512 / maskable).
- Same geometric mark language across header, landing, and home-screen icons.
- See the in-app **Updates** tab for the full changelog.

### What’s new in v2.5.0

- Mobile: Quick Widget + Pomodoro default **off** for new / unsaved prefs (saved prefs preserved); desktop defaults unchanged.
- SM-2 rating previews: Again ~1m, Hard ~10m, Good 1d, Easy 4d on new cards — labels match scheduled `next_review`.
- Landing locked to default emerald brand (ignores Settings accent / Light remaps); in-app theme unchanged.
- Logo: in-app `</>` mark without decorative dots; PWA / Apple touch icons rebuilt (white glyph, solid black, no frame).
- Command palette: **⌘K / Ctrl+K** opens the same palette as the header chip.
- Smart Quick: **Zen / Deep Focus** toggle available in the Quick Widget action catalog.
- See the in-app **Updates** tab for the full changelog.

### What’s new in v2.4.0

- Landing: tighter hero/nav spacing so content sits higher; smaller inset product mockup (no heavy window on the section divider).
- Landing: expanded study-hubs blurb + FAQ (tutor grounding, unified agenda, multi-device) for a fuller page below the fold.
- Dashboard header: smaller hamburger / X aligned inside the header row; larger Fios logo + wordmark; logo click opens **Overview**.
- Mobile uploads: iOS PDF block removed; PDFs extract on the server when needed; images from Photos / gallery via Vision; flashcards generate crash fixed.
- PWA: apple-touch-icon **180×180** plus 192/512 icons regenerated from the current Fios logo with safe padding (manifest + HTML tags).
- See the in-app **Updates** tab for the full changelog.

### What’s new in v2.3.1

- Header hamburger / X restyled to match top-bar chrome (size, radius, accent border, logo alignment); toggle still opens drawer / sidebar.
- Compact agenda: tasks sort and appear by **due date** (not start); calendar day headers (Today / Tomorrow / weekday) group classes + tasks.
- Overview Focus card waits for tasks to load before showing pending count or “You’re all caught up” (no false empty flash on tab switch).
- ATU Academic Calendar key-date descriptions no longer show leftover `[cite: N]` markers.
- Mobile polish for Focus/agenda/header wrap, scrollable bottom nav, and Timetable institution field.
- See the in-app **Updates** tab for the full changelog.

### What’s new in v2.3.0

- Header menu (hamburger / X) reliably toggles mobile drawer + desktop sidebar (toggle stays above the drawer).
- Task Start / Due datetime inputs actually changeable and saved (theme-aware native picker + open button).
- Contact Support in-app send → `POST /api/support` → Resend/SendGrid when keys are set; clear error if unconfigured.
- Landing page refresh covering schedule/agenda, study hubs, AI Tutor, flashcards, notes, Code Lab, themes, PWA, privacy/legal.
- See the in-app **Updates** tab for the full changelog.

### What’s new in v2.2.0

- Zen/mobile escape hardening, bottom-nav + widget prefs, FAB/Pomodoro dock, expanded Smart Quick catalog.
- Icons, accent gradients, light-mode cream/contrast, card/tab hierarchy.
- Landing FAQ + bug/UI polish; SM-2 / Active Recall fixes.
- Universal/manual schedule + iCal mode; finished-class mute + Next Class highlight.
- Expanded module accent palette; CompactAgenda performance; timed tasks on the unified timeline.
- In-app feedback & ratings; Privacy Policy / Terms / consent / export refresh for GDPR-style transparency.
- Mobile touch targets and gesture hardening (nav, Zen exit, FAB, flashcard swipe, agenda scroll).
- Settings tip: optional paid Gemini (Google AI Studio) when free-tier capacity is overloaded.
- See the in-app **Updates** tab for the full changelog.

---

## Bring Your Own Key (BYO-Key) architecture

Fios is **privacy-first**. Instead of reselling AI access, each user plugs in their **own free Google Gemini API key** in Settings:

- The key is stored on the user's profile row (`user_profiles.gemini_api_key`) under Row Level Security.
- The client attaches the key to each AI request; the Express server uses it per-request (falling back to a server key only if configured).
- AI-dependent features (Quiz Generator, Code Exams, PDF Summarizer, AI Tutor) are **gated** behind a sleek "Gemini Key Required" modal with an instant input and a link to [Google AI Studio](https://aistudio.google.com/app/apikey).

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS 4, Framer Motion, `@monaco-editor/react`, Mermaid.js, KaTeX, react-markdown, VitePWA, Web Audio API, lucide-react |
| Backend | Node.js, Express 5, TypeScript (`tsc` build / `tsx` dev), `@google/genai` (Gemini), multer |
| Hosting | **Render** — Web Service (`server`) + Static Site (`client`); see [`render.yaml`](render.yaml) |
| Data & Auth | Supabase (Postgres + Auth + Row Level Security); optional GitHub OAuth |
| AI | Google Gemini API (BYO key) |

### Signature features in depth
- **Revision Flight Plan** (`client/src/lib/flightPlan.ts`) scores each module on exam proximity (`modules.exam_date`), due SM-2 cards (`cards.next_review`), and readiness, then surfaces the top 3 actions on the dashboard.
- **Active Recall Evaluator** posts your free-recall text + related `documents` to `POST /api/active-recall`; Gemini returns per-concept statuses and an accuracy score saved to `active_recall_logs`.
- **Pomodoro Soundscapes** (`client/src/lib/soundscapes.ts`) synthesize ambient audio live with the Web Audio API — no audio files shipped (brown / soft white / rain / ocean / forest / cafe / fireplace / library / lofi / binaural).
- **Universal gradient engine** — `user_profiles.accent_color` maps to CSS variables (`--fios-accent-from/via/to/solid`) consumed by `.accent-bg`, `.accent-text`, `.accent-ring`, and the `<FiosLogo />`.
- **Light mode** remaps legacy dark tokens to a warm off-white / stone palette via `[data-theme="light"]`; System mode follows `prefers-color-scheme`.
- **RAG study engine** — `POST /api/rag/query` + `POST /api/upload/pdf`; client helpers in `lib/ragClient.ts`.

### Brand & design
- Custom vector **`<FiosLogo />`** (balanced `</>` mark; sizes `sm`–`xl`) used in the navbar, mobile header, landing hero, auth screens, and favicon / PWA icons.
- The public **landing page is theme-locked** to Fios's signature pitch-black + emerald identity; dashboard theming never applies to it.

### Mobile & cross-browser
- Dynamic viewport height (`100dvh`) to avoid mobile address-bar clipping.
- iPhone safe-area padding, slide-out drawer, hot-swappable bottom nav (Preferences), and floating quick-actions.
- 16px minimum input font size to stop iOS focus-zoom; touch-optimized Monaco editor (`automaticLayout`).

---

## Project structure

```
Fios/
├── render.yaml             # Render Blueprint (API + Static Site)
├── client/                 # React + Vite frontend (v3.7.6) — Render Static Site root
│   ├── package.json        # ← Root Directory must point HERE (not client/src)
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── lib/apiBase.ts  # VITE_API_URL → Render API origin
│   │   ├── services/
│   │   └── types/
│   └── public/
├── server/                 # Express API — Render Web Service root
│   ├── package.json        # ← Root Directory must point HERE (not server/src)
│   └── src/                # routes.ts, geminiService.ts, index.ts
├── supabase/schema.sql
└── CONTRIBUTING.md
```

> **Common Render failure:** Root Directory set to `src` → `ENOENT …/src/package.json`. Always use `server` or `client` (the folders that contain `package.json`).

---

## Deploy on Render

**Live API service:** [Fios](https://fios-akjy.onrender.com) (`srv-das193rbc2fs738u2rug`) · branch `main` · auto-deploy.

Blueprint: [`render.yaml`](render.yaml).

### Build Command (API)

`server/package.json` includes `"build": "tsc"` (since v2.2.2). Use:

`npm install --include=dev && npm run build`

(`--include=dev` matters when `NODE_ENV=production` would otherwise skip `typescript` / `@types/*`. v2.2.2+ also keeps those packages in `dependencies` for Render.)

### Option A — single Web Service (recommended for your workspace)

You currently have **one** service. Point it at the **repo root** so Express can serve the Vite SPA + `/api`:

| Setting | Value |
| --- | --- |
| Root Directory | **empty / `.`** (repo root — not `server/`, not `src`) |
| Build Command | `npm run build` |
| Start Command | `npm start` |
| Health Check | `/health` |

Root `package.json` builds `server` then `client`. Express serves `client/dist` when present. **Leave `VITE_API_URL` unset** (same-origin `/api`).

Also set on the service (build-time for Vite): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `GEMINI_API_KEY`.

### Option B — keep Root Directory = `server/` (API-only)

| Setting | Value |
| --- | --- |
| Root Directory | **`server`** |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npm start` |

Then add a **Static Site** for the UI:

| Setting | Value |
| --- | --- |
| Root Directory | **`client`** |
| Build Command | `npm install --include=dev && npm run build` |
| Publish Directory | `dist` |
| `VITE_API_URL` | **`https://fios-akjy.onrender.com`** (no `/api`, no trailing slash) |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Your Supabase project |
| `CLIENT_ORIGIN` (on API) | Your Static Site URL |

Redeploy the Static Site after any `VITE_*` change.

### Assumed vs you must set

| Item | Assumed | You set |
| --- | --- | --- |
| API URL | `https://fios-akjy.onrender.com` | Confirm in dashboard |
| Single vs split | Prefer Option A if only one service | Clear Root Dir → `.` for Option A |
| `VITE_API_URL` | Empty for Option A | Option B: `https://fios-akjy.onrender.com` |
| Supabase `VITE_*` | Examples only | Real credentials |

---

## Local setup

See also [`CONTRIBUTING.md`](CONTRIBUTING.md).

### Prerequisites
- Node.js v18+ (developed on v22)
- A Supabase project (free tier is fine)
- A Google Gemini API key ([AI Studio](https://aistudio.google.com/app/apikey)) — per-user (BYO) and/or a server fallback

### 1. Database
In the Supabase SQL editor, run [`supabase/schema.sql`](supabase/schema.sql). It is idempotent and creates all tables (`user_profiles` (+ `prefs`), `modules` (+ `tags`/`parent_code`), `decks`, `cards`, `mcq_quizzes`, `code_exams`, `tasks` (+ `due_at`/`start_at`), `documents`, `document_revisions`, `tutor_messages`, `note_chunks`, `grades`, `focus_sessions`, `active_recall_logs`, `feedback`), Row Level Security policies, and a trigger that auto-provisions a **clean, empty profile** for every new signup (no sample data).

If Smart Notes shows `Could not find the 'content' column of 'documents' in the schema cache`, run the short idempotent script [`supabase/documents-content.sql`](supabase/documents-content.sql) (or the matching block at the end of `schema.sql`), then **Reload schema** under Project Settings → API (or wait ~1 min / `NOTIFY pgrst, 'reload schema'`).

> In your Supabase Auth settings, disable "Confirm email" for the fastest local sign-in, or confirm the address you register with. Enable the GitHub provider if you want OAuth sign-in.

### 2. Server
```bash
cd server
npm install
# optional server-side fallback key (users can also BYO in Settings):
echo "GEMINI_API_KEY=your_key_here" > .env
echo "PORT=5000" >> .env
npm run dev            # http://localhost:5000
```

### 3. Client
```bash
cd client
npm install
# .env (client) — leave VITE_API_URL empty locally
printf "VITE_SUPABASE_URL=your-project-url\nVITE_SUPABASE_ANON_KEY=your-anon-key\n" > .env
npm run dev            # http://localhost:5173
```

The Vite dev server proxies `/api/*` to the Express server on port 5000.

### Live demo (no backend/login)
Click **"Explore Live Demo"** on the landing page, or build/run the client with `VITE_DEMO_MODE=true`. Demo mode bypasses auth with in-memory sample data and never makes network calls — ideal for previewing the dashboard.

---

## Scripts

| Location | Command | Description |
| --- | --- | --- |
| `client` | `npm run dev` | Start the Vite dev server |
| `client` | `npm run build` | Type-check (`tsc`) + production build (PWA) |
| `client` | `npm run typecheck` | Type-check only |
| `server` | `npm run dev` | Start the API with hot reload |
| `server` | `npm run build` | Compile TypeScript → `dist/` (Render) |
| `server` | `npm start` | Run `node dist/index.js` (Render) |

---

## REST API (server)

| Endpoint | Purpose |
| --- | --- |
| `GET  /health` | Health check for Render |
| `POST /api/generate/flashcards` | Generate flashcards from notes |
| `POST /api/generate/quiz` | Generate an MCQ quiz |
| `POST /api/generate/code-exam` | Generate a coding challenge (`customPrompt` supported) |
| `POST /api/grade/code-exam` | Grade a code submission |
| `POST /api/summarize` | Summarize a document + glossary |
| `POST /api/tutor` | Grounded AI tutor answer (optional `ragContext`) |
| `POST /api/active-recall` | Evaluate a free-recall "blurting" attempt |
| `POST /api/validate-key` | Validate a Gemini API key |
| `POST /api/upload/pdf` | Accept PDF/text upload for study-engine indexing |
| `POST /api/rag/query` | Retrieve relevant note chunks |
| `GET|POST /api/ical-proxy` | CORS proxy for iCal/WebCAL timetables (`?url=` or JSON `{ url }`) |
| `POST /api/support` | In-app support message → Resend/SendGrid (`SUPPORT_EMAIL`); 503 if unconfigured |

All AI endpoints accept an optional `apiKey` (BYO key) in the JSON body or an `x-gemini-key` header.

---

## Privacy & data protection

Fios is designed with GDPR-style transparency:

- **In-app Privacy Policy & Terms** — landing footer and Settings (Support / Legal).
- **Cookie / local storage banner** — essential storage only; no ad trackers; link to Privacy Policy.
- **Export** — Settings → Export My Data (JSON) for portability.
- **Processors** — Supabase (Auth + DB + RLS), Google Gemini (your BYO key), optional GitHub OAuth/gists, and your host (e.g. Render) for the web/API.
- **Contact** for access/erasure requests is listed in the Privacy Policy.

---

## Acknowledgements

Fios was designed and implemented as an AI-built test application using **Google Gemini** and **Cursor Agent Mode**. Contributions from the agent include the full feature set, the custom brand identity, the Supabase schema, and this documentation.
