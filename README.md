# Fios — Your Academic Command Center

> **Fios is a test application, created end-to-end using AI tools — specifically Google's Gemini API and [Cursor](https://cursor.com) (Agent Mode).** It was built to explore how far agent-driven development can take a real, full-stack study platform. Treat it as a reference/demo project rather than a production service.

**Current version: v2.2.2**

Fios turns raw lecture notes into **SM-2 spaced-repetition flashcards, MCQ quizzes, Monaco-powered code exams, and an AI tutor**, wrapped in a modern dashboard with a global Pomodoro timer, a grade predictor, and a module-readiness heatmap.

---

## Highlights

- **SM-2 Flashcards** — AI-generated decks scheduled with the SM-2 algorithm; touch swipe Easy/Hard on mobile.
- **MCQ Quiz Generator** — practice exams with explanations, saved per module.
- **Monaco Code Exams** — bug-fix, output-prediction, and logic-completion challenges with optional custom prompts.
- **Smart Notes & AI Tutor** — upload PDFs/notes for summaries, glossaries, revision history, and a dedicated full-screen tutor tab (RAG-aware).
- **AI Active Recall ("Blurting")** — write everything you remember; Gemini returns a color-coded report and Recall Accuracy %.
- **Revision Flight Plan** — dashboard queue prioritized by exam proximity, overdue SM-2 cards, and readiness (modular / reorderable widgets).
- **Grade Predictor** — computes the scores you need across assessments to hit a target grade.
- **Module Readiness Heatmap** — 0–100% readiness per module; modules support tag/folder groups.
- **Global Pomodoro Timer** — floating widget with Web Audio soundscapes and Weekly Study Goal tracker (can be disabled in Settings).
- **Smart Quick Widget** — floating quick actions with customizable metrics/actions (can be fully disabled).
- **PWA** — installable standalone app via VitePWA + Workbox; offline mutation queue (IndexedDB).
- **Themes** — Dark / Light / System, Low-Power mode, Zen focus (with Esc / Exit Zen escape), OpenDyslexic, warm light palette.
- **Nav customization** — reorder desktop sidebar; add/hide/reorder mobile bottom-nav slots.
- **Mermaid + Markdown + LaTeX** — diagrams, GFM markdown, and KaTeX math in AI content.
- **Command palette** — Ctrl/Cmd+K fuzzy navigation; cookie consent + Terms of Service.
- **Render hosting** — Express Web Service (`server/`) + Static Site (`client/`); client calls API via `VITE_API_URL` (fixes production 405s from SPA/static intercepts).

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
- Custom vector **`<FiosLogo />`** (geometric `</>` + glowing core nodes; sizes `sm`–`xl`) used in the navbar, mobile header, landing hero, auth screens, and favicon.
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
├── client/                 # React + Vite frontend (v2.2.2) — Render Static Site root
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

Blueprint: commit [`render.yaml`](render.yaml) and **New → Blueprint** from the repo, or create two services manually:

### 1) API — Web Service

| Setting | Value |
| --- | --- |
| Root Directory | **`server`** (not `src`, not `server/src`) |
| Runtime | Node |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

**Env vars (API):**

| Key | Notes |
| --- | --- |
| `GEMINI_API_KEY` | Optional server fallback key |
| `CLIENT_ORIGIN` | Your Static Site origin, e.g. `https://fios-web.onrender.com` (comma-separated if multiple) |
| `PORT` | Set automatically by Render — do not hardcode |

After deploy, copy the service URL (e.g. `https://fios-api.onrender.com`).

### 2) Frontend — Static Site

| Setting | Value |
| --- | --- |
| Root Directory | **`client`** (not `src`, not `client/src`) |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

**Env vars (Static Site — baked in at build time):**

| Key | Notes |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_API_URL` | **API origin only** — e.g. `https://fios-api.onrender.com` (no `/api` suffix, no trailing slash) |
| `VITE_ADMIN_UID` | Optional admin UUID |
| `VITE_DEMO_MODE` | `false` for production |

`VITE_API_URL` is required when the static site and API are separate hosts. Leaving it empty makes the browser call relative `/api/…` (works locally via Vite proxy; fails on a Static Site alone → 405/HTML).

Redeploy the Static Site after changing any `VITE_*` variable.

### Assumed vs you must set

| Item | Assumed in repo | You must set |
| --- | --- | --- |
| Split services (API + Static) | Yes (`render.yaml`) | Confirm service names/URLs |
| `VITE_API_URL` | Placeholder in examples | Real `https://<api-service>.onrender.com` |
| `CLIENT_ORIGIN` | Placeholder | Real Static Site URL |
| Supabase keys | Examples only | Your project credentials |

---

## Local setup

See also [`CONTRIBUTING.md`](CONTRIBUTING.md).

### Prerequisites
- Node.js v18+ (developed on v22)
- A Supabase project (free tier is fine)
- A Google Gemini API key ([AI Studio](https://aistudio.google.com/app/apikey)) — per-user (BYO) and/or a server fallback

### 1. Database
In the Supabase SQL editor, run [`supabase/schema.sql`](supabase/schema.sql). It is idempotent and creates all tables (`user_profiles` (+ `prefs`), `modules` (+ `tags`/`parent_code`), `decks`, `cards`, `mcq_quizzes`, `code_exams`, `tasks`, `documents`, `document_revisions`, `tutor_messages`, `note_chunks`, `grades`, `focus_sessions`, `active_recall_logs`), Row Level Security policies, and a trigger that auto-provisions a **clean, empty profile** for every new signup (no sample data).

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

All AI endpoints accept an optional `apiKey` (BYO key) in the JSON body or an `x-gemini-key` header.

---

## Acknowledgements

Fios was designed and implemented as an AI-built test application using **Google Gemini** and **Cursor Agent Mode**. Contributions from the agent include the full feature set, the custom brand identity, the Supabase schema, and this documentation.
