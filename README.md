# Fios — Your Academic Command Center

> **Fios is a test application, created end-to-end using AI tools — specifically Google's Gemini API and [Cursor](https://cursor.com) (Agent Mode).** It was built to explore how far agent-driven development can take a real, full-stack study platform. Treat it as a reference/demo project rather than a production service.

**Current version: v3.1.0**

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
- **Brain Dump inbox** — floating quick-capture with optional AI parse into tasks.
- **Class Reminders** — optional browser notifications (5–30 min lead) for upcoming classes; Web Push when VAPID is configured.
- **Universal schedule** — iCal sync or manual timetable for any college; iCal helper + clearer errors; finished classes muted; Next Up highlight.
- **Unified agenda** — classes + timed tasks on a calendar-day timeline (memoized CompactAgenda); tasks sort by due date; start/due datetime pickers update and save.
- **Holiday greetings & day-only themes** — Overview holiday greetings and temporary accent palettes on key dates (Christmas Eve–26 window); landing stays emerald.
- **Contact Support** — in-app message form posts to the API and emails the support inbox (Resend/SendGrid when configured); mailto remains optional.
- **Feedback & ratings** — optional star rating, categories, and message (anonymous submit supported).
- **Privacy & GDPR** — in-app Privacy Policy + Terms (landing footer and Settings); disclosures for Web Push, multimodal uploads, Supabase, Gemini (BYO key), optional GitHub, and hosting; Export My Data (JSON).
- **Global Pomodoro Timer** — floating dock widget with Web Audio soundscapes and Weekly Study Goal (defaults off on mobile until enabled in Settings; legacy baked-on prefs migrated).
- **Smart Quick Widget** — expanded actions, custom order, compact FAB, metrics chip (defaults off on mobile until enabled; legacy baked-on prefs migrated).
- **Themes** — Dark / Light / System, expanded accent gradients, Low-Power mode, Zen focus (Esc / Exit Zen / mobile escape), OpenDyslexic, cream light palette with stronger cards/tabs. Landing marketing stays locked to default emerald.
- **Nav customization** — header hamburger toggles mobile drawer and desktop sidebar (compact chrome control, larger Fios wordmark; logo opens Overview); reorder desktop sidebar (drag or Settings); add/hide/reorder mobile bottom-nav slots (persisted prefs); sticky mobile header.
- **Mermaid + Markdown + LaTeX** — diagrams, GFM markdown, and KaTeX math in AI content.
- **Command palette** — Ctrl/Cmd+K fuzzy navigation; cookie consent + Terms of Service; refreshed landing (tighter hero + study hubs + FAQ).
- **Mobile study upload** — PDF / TXT / images (iPhone Photos + Android); server PDF extract for iOS Files picker; Vision multimodal for photos.
- **PWA** — installable standalone app (apple-touch 180×180, 192/512, maskable — white `</>` on solid black) via VitePWA + Workbox; offline mutation queue (IndexedDB) + network indicator.
- **Render hosting** — Express Web Service (`server/` / fios-api) + Static Site (`client/` / fios-web); client calls API via `VITE_API_URL`.

### What’s new in v3.1.0

- Edit modules from the Modules tab (pencil on each card): name, optional course code, accent, tags — same store as create.
- Name-first badges and selectors everywhere (decks, quizzes, code exams, documents, tasks, pickers) — module titles like “Java”, not code shorthand like “GG”.
- Course code remains fully optional; UI never treats an empty/synthetic code as the primary identity when a name exists.
- See the in-app **Updates** tab for the full v3.1.0 note.

### What’s new in v3.0.0

- Major release: multimodal AI Tutor uploads, Class Reminders (Web Push / local), study streak heatmap, exam countdown, Brain Dump inbox, semester GPA, deck export/import, audio/vision Smart Notes, SM-2 onboarding tip, MCQ length 5–40, inline renames, holiday greetings & day-only themes, sticky mobile header, network indicator, iCal helper, and privacy/FAQ updates for push + multimodal.
- Supabase: additive `documents.content` (+ optional `push_subscriptions`) migration in `supabase/schema.sql` — reload PostgREST schema cache after applying.
- Render: set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` for server Web Push (local reminders still work without them).
- See the in-app **Updates** tab for the full changelog (items covering the v3.0.0 feature set).

### What’s new in v2.2.9

- Mobile: Quick Widget FAB + Pomodoro floating widget **reliably default OFF** unless the user has toggled them in Settings (fixes returning users stuck with old baked-in `true` prefs from v2.2.7’s incomplete fix).
- New `floatingWidgetsExplicit` flag distinguishes intentional overrides from system defaults; profile sync no longer re-enables widgets from legacy remote prefs.
- Desktop defaults remain ON; Settings toggles still persist across devices once set explicitly.
- Mobile nav drawer: page scroll locked while open (iOS-safe body lock + backdrop touchmove block); scroll restored on close.
- See the in-app **Updates** tab for the full changelog.

### What’s new in v2.2.8

- Logo polish: in-app `</>` mark rebalanced (wider optical weight, even stroke gaps, comfortable padding, slightly more air before the wordmark).
- PWA / Apple touch / favicon: regenerated white `</>` on solid black with ~18–22% inset — centered, not stretched or edge-cramped (180 / 192 / 512 / maskable).
- Same geometric mark language across header, landing, and home-screen icons.
- See the in-app **Updates** tab for the full changelog.

### What’s new in v2.2.7

- Mobile: Quick Widget + Pomodoro default **off** for new / unsaved prefs (saved prefs preserved); desktop defaults unchanged.
- SM-2 rating previews: Again ~1m, Hard ~10m, Good 1d, Easy 4d on new cards — labels match scheduled `next_review`.
- Landing locked to default emerald brand (ignores Settings accent / Light remaps); in-app theme unchanged.
- Logo: in-app `</>` mark without decorative dots; PWA / Apple touch icons rebuilt (white glyph, solid black, no frame).
- Command palette: **⌘K / Ctrl+K** opens the same palette as the header chip.
- Smart Quick: **Zen / Deep Focus** toggle available in the Quick Widget action catalog.
- See the in-app **Updates** tab for the full changelog.

### What’s new in v2.2.6

- Landing: tighter hero/nav spacing so content sits higher; smaller inset product mockup (no heavy window on the section divider).
- Landing: expanded study-hubs blurb + FAQ (tutor grounding, unified agenda, multi-device) for a fuller page below the fold.
- Dashboard header: smaller hamburger / X aligned inside the header row; larger Fios logo + wordmark; logo click opens **Overview**.
- Mobile uploads: iOS PDF block removed; PDFs extract on the server when needed; images from Photos / gallery via Vision; flashcards generate crash fixed.
- PWA: apple-touch-icon **180×180** plus 192/512 icons regenerated from the current Fios logo with safe padding (manifest + HTML tags).
- See the in-app **Updates** tab for the full changelog.

### What’s new in v2.2.5

- Header hamburger / X restyled to match top-bar chrome (size, radius, accent border, logo alignment); toggle still opens drawer / sidebar.
- Compact agenda: tasks sort and appear by **due date** (not start); calendar day headers (Today / Tomorrow / weekday) group classes + tasks.
- Overview Focus card waits for tasks to load before showing pending count or “You’re all caught up” (no false empty flash on tab switch).
- ATU Academic Calendar key-date descriptions no longer show leftover `[cite: N]` markers.
- Mobile polish for Focus/agenda/header wrap, scrollable bottom nav, and Schedule institution field.
- See the in-app **Updates** tab for the full changelog.

### What’s new in v2.2.4

- Header menu (hamburger / X) reliably toggles mobile drawer + desktop sidebar (toggle stays above the drawer).
- Task Start / Due datetime inputs actually changeable and saved (theme-aware native picker + open button).
- Contact Support in-app send → `POST /api/support` → Resend/SendGrid when keys are set; clear error if unconfigured.
- Landing page refresh covering schedule/agenda, study hubs, AI Tutor, flashcards, notes, Code Lab, themes, PWA, privacy/legal.
- See the in-app **Updates** tab for the full changelog.

### What’s new in v2.2.3

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
- **Pomodoro Soundscapes** (`client/src/lib/soundscapes.ts`) synthesize ambient audio live with the Web Audio API — no audio files shipped.
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
├── client/                 # React + Vite frontend (v3.1.0) — Render Static Site root
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
