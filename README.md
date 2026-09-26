# Fios — Your Academic Command Center

> **Fios is a test application, created end-to-end using AI tools — specifically Google's Gemini API and [Cursor](https://cursor.com) (Agent Mode).** It was built to explore how far agent-driven development can take a real, full-stack study platform. Treat it as a reference/demo project rather than a production service.

**Current version: v2.2.1**

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
- **Global Pomodoro Timer** — floating widget with Web Audio soundscapes and Weekly Study Goal tracker.
- **PWA** — installable standalone app via VitePWA + Workbox; offline mutation queue (IndexedDB).
- **Themes** — Dark / Light / System, Low-Power mode, Zen (study views only + Esc exit), OpenDyslexic, high-contrast light palette (`#f8fafc` / white / `#f1f5f9`).
- **Mermaid + Markdown + LaTeX** — diagrams, GFM markdown, and KaTeX math in AI content.
- **Command palette** — Ctrl/Cmd+K fuzzy navigation; cookie consent + Privacy / Terms / Cookie Policy.
- **Live-demo AI auth guard** — guests can browse; cloud AI / uploads require sign-in (GitHub or email).

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
| Backend | Node.js, Express 5, TypeScript (`tsx`), `@google/genai` (Gemini), multer |
| Data & Auth | Supabase (Postgres + Auth + Row Level Security); optional GitHub OAuth |
| AI | Google Gemini API (BYO key) |

### Signature features in depth
- **Revision Flight Plan** (`client/src/lib/flightPlan.ts`) scores each module on exam proximity (`modules.exam_date`), due SM-2 cards (`cards.next_review`), and readiness, then surfaces the top 3 actions on the dashboard.
- **Active Recall Evaluator** posts your free-recall text + related `documents` to `POST /api/active-recall`; Gemini returns per-concept statuses and an accuracy score saved to `active_recall_logs`.
- **Pomodoro Soundscapes** (`client/src/lib/soundscapes.ts`) synthesize ambient audio live with the Web Audio API — no audio files shipped.
- **Universal gradient engine** — `user_profiles.accent_color` maps to CSS variables (`--fios-accent-from/via/to/solid`) consumed by `.accent-bg`, `.accent-text`, `.accent-ring`, and the `<FiosLogo />`.
- **Light mode** remaps legacy dark tokens to a high-contrast slate palette via `[data-theme="light"]` (soft multi-layer shadows); System mode follows `prefers-color-scheme`.
- **RAG study engine** — `POST /api/rag/query` + `POST /api/upload/pdf`; client helpers in `lib/ragClient.ts`.
- **Vercel API bridge** — `api/index.ts` + root `vercel.json` rewrite `/api/*` to the Express app so tutor/generate never hit the SPA HTML 404.

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
ai-study-app/
├── client/                 # React + Vite frontend (v2.2.1)
│   ├── src/
│   │   ├── components/      # UI (dashboard, landing, code lab, AI tutor, …)
│   │   ├── context/         # Profile, Theme, Preferences, Pomodoro
│   │   ├── lib/             # Supabase + offline queue + RAG + services
│   │   ├── services/        # API clients (flashcards, quiz, code, ai)
│   │   └── types/           # Shared DB + API types
│   └── public/favicon.svg
├── server/                 # Express + Gemini study engine
│   └── src/                # routes.ts, geminiService.ts, schemas.ts
├── supabase/schema.sql     # Idempotent schema + RLS + v2.2.1 tables
└── CONTRIBUTING.md         # Dev setup & migration notes
```

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
# .env (client)
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

---

## REST API (server)

| Endpoint | Purpose |
| --- | --- |
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
| `GET  /api/ical-proxy` | CORS proxy for iCal/WebCAL timetables |

All AI endpoints accept an optional `apiKey` (BYO key) in the JSON body or an `x-gemini-key` header.

---

## Acknowledgements

Fios was designed and implemented as an AI-built test application using **Google Gemini** and **Cursor Agent Mode**. Contributions from the agent include the full feature set, the custom brand identity, the Supabase schema, and this documentation.
