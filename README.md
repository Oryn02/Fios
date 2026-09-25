# Fios — Your Academic Command Center

> **Fios is a test application, created end-to-end using AI tools — specifically Google's Gemini API and [Cursor](https://cursor.com) (Agent Mode).** It was built to explore how far agent-driven development can take a real, full-stack study platform. Treat it as a reference/demo project rather than a production service.

Fios turns raw lecture notes into **SM-2 spaced-repetition flashcards, MCQ quizzes, Monaco-powered code exams, and an AI tutor**, wrapped in a modern dashboard with a global Pomodoro timer, a grade predictor, and a module-readiness heatmap.

---

## Highlights

- **SM-2 Flashcards** — AI-generated decks scheduled with the SM-2 algorithm.
- **MCQ Quiz Generator** — practice exams with explanations, saved per module.
- **Monaco Code Exams** — bug-fix, output-prediction, and logic-completion challenges (JS/TS/Python/C) graded by AI.
- **Smart Notes & AI Tutor** — upload PDFs/notes for summaries, glossaries, and a grounded chat drawer.
- **Grade Predictor** — computes the scores you need across assessments to hit a target grade.
- **Module Readiness Heatmap** — a 0–100% readiness score per module from your decks, quizzes, and code exams.
- **Global Pomodoro Timer** — a persistent floating widget that follows you across the app and feeds your Weekly Study Goal.
- **Custom branding** — a bespoke vector `<FiosLogo />` brandmark, dark/light themes, and five gradient accents.

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
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS 4, Framer Motion, `@monaco-editor/react`, lucide-react |
| Backend | Node.js, Express 5, TypeScript (`tsx`), `@google/genai` (Gemini) |
| Data & Auth | Supabase (Postgres + Auth + Row Level Security) |
| AI | Google Gemini API (BYO key) |

### Brand & design
- Custom vector **`<FiosLogo />`** component (sizes `sm`–`xl`, icon-only or icon + wordmark) used in the navbar, mobile header, landing hero, auth screens, and favicon.
- The public **landing page is theme-locked** to Fios's signature pitch-black + emerald identity; dashboard theming (dark/light + accent) never applies to it.

### Mobile & cross-browser
- Dynamic viewport height (`100dvh`) to avoid mobile address-bar clipping.
- iPhone safe-area padding (`env(safe-area-inset-bottom)`), a `< md` bottom navigation bar, and a floating quick-actions button.
- 16px minimum input font size to stop iOS focus-zoom; touch-optimized Monaco editor (`automaticLayout`).

---

## Project structure

```
ai-study-app/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/      # UI (dashboard, landing, code lab, AI tutor, …)
│   │   ├── context/         # Profile, Theme, Pomodoro providers
│   │   ├── lib/             # Supabase + data services (demo-aware)
│   │   ├── services/        # API clients (flashcards, quiz, code, ai)
│   │   └── types/           # Shared DB + API types
│   └── public/favicon.svg
├── server/                 # Express + Gemini API
│   └── src/                # routes.ts, geminiService.ts, schemas.ts
└── supabase/schema.sql     # Idempotent schema + RLS + profile trigger
```

---

## Local setup

### Prerequisites
- Node.js v18+ (developed on v22)
- A Supabase project (free tier is fine)
- A Google Gemini API key ([AI Studio](https://aistudio.google.com/app/apikey)) — per-user (BYO) and/or a server fallback

### 1. Database
In the Supabase SQL editor, run [`supabase/schema.sql`](supabase/schema.sql). It is idempotent and creates all tables (`user_profiles`, `modules`, `decks`, `cards`, `mcq_quizzes`, `code_exams`, `tasks`, `documents`, `grades`, `focus_sessions`), Row Level Security policies, and a trigger that auto-provisions a **clean, empty profile** for every new signup (no sample data).

> In your Supabase Auth settings, disable "Confirm email" for the fastest local sign-in, or confirm the address you register with.

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
| `client` | `npm run build` | Type-check (`tsc`) + production build |
| `client` | `npm run typecheck` | Type-check only |
| `server` | `npm run dev` | Start the API with hot reload |

---

## REST API (server)

| Endpoint | Purpose |
| --- | --- |
| `POST /api/generate/flashcards` | Generate flashcards from notes |
| `POST /api/generate/quiz` | Generate an MCQ quiz |
| `POST /api/generate/code-exam` | Generate a coding challenge |
| `POST /api/grade/code-exam` | Grade a code submission |
| `POST /api/summarize` | Summarize a document + glossary |
| `POST /api/tutor` | Grounded AI tutor answer |
| `POST /api/validate-key` | Validate a Gemini API key |
| `GET  /api/ical-proxy` | CORS proxy for iCal/WebCAL timetables |

All AI endpoints accept an optional `apiKey` (BYO key) in the JSON body or an `x-gemini-key` header.

---

## Acknowledgements

Fios was designed and implemented as an AI-built test application using **Google Gemini** and **Cursor Agent Mode**. Contributions from the agent include the full feature set, the custom brand identity, the Supabase schema, and this documentation.
