# Contributing to Fios

Thanks for helping improve Fios. This guide covers local setup, schema migrations, and architecture notes for v2.2.0+.

## Prerequisites

- Node.js 18+ (22 recommended)
- A Supabase project (Auth + Postgres)
- Optional: Google Gemini API key for AI features
- Optional: `VITE_ADMIN_UID` matching a user UUID for the Admin panel
- Optional: GitHub OAuth enabled in Supabase Auth for “Sign in with GitHub”

## Environment

### Client (`client/.env`)

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
# optional
VITE_DEMO_MODE=false
VITE_ADMIN_UID=your-supabase-user-uuid
VITE_GITHUB_TOKEN=ghp_xxx   # only for automatic gist export
```

### Server (`server/.env`)

```bash
PORT=5000
GEMINI_API_KEY=optional-server-fallback-key
```

The Vite dev server proxies `/api` → `http://localhost:5000`.

## Database migrations

1. Open the Supabase SQL editor.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in full — it is **idempotent**.
3. v2.2.0 additions (also in that file):
   - `user_profiles.prefs` (jsonb)
   - `modules.parent_code`, `modules.tags`
   - `document_revisions`, `tutor_messages`, `note_chunks` (+ RLS)

If a column/table already exists, `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` keep the run safe.

## Develop

```bash
# terminal 1
cd server && npm install && npm run dev

# terminal 2
cd client && npm install && npm run dev
```

Useful scripts:

| Command | Where | Purpose |
| --- | --- | --- |
| `npm run dev` | client / server | Hot reload |
| `npm run typecheck` | client | `tsc --noEmit` |
| `npm run build` | client | Typecheck + Vite production build (includes PWA assets) |
| `npm run lint` | client | ESLint |

## Architecture (short)

```
client/src/
  components/   UI (dashboard, tutor, flashcards, settings, …)
  context/      Profile, Theme, Preferences, Pomodoro
  lib/          Supabase services, offline queue, RAG client, calendar
  services/     HTTP clients for Express AI routes
  types/        Shared DB + API types
server/src/
  routes.ts           Express routes (/api/…)
  geminiService.ts    Gemini study engine (flashcards, RAG, tutor, …)
  schemas.ts          Response shapes
supabase/schema.sql   Idempotent Postgres + RLS
```

### Key v2.2.0 client patterns

- **PreferencesContext** — lowPower, zenMode, openDyslexic, widget order, mobile nav slots (localStorage + optional `prefs` jsonb).
- **ThemeContext** — `dark | light | system` with `resolvedTheme` via `prefers-color-scheme`.
- **AiTutorView** — top-level `/tutor` tab; chat history in localStorage (and `tutor_messages` when available).
- **offlineQueue** — IndexedDB mutation queue flushed on `online`.
- **ragClient** — `POST /api/rag/query` and `POST /api/upload/pdf`.
- **VitePWA** — standalone manifest + Workbox caching.

## Pull requests

- Prefer small, focused PRs.
- Run `cd client && npm run typecheck` before opening a PR.
- Do not commit secrets (`.env`, API keys, tokens).
- Keep schema changes idempotent and documented in this file + README.

## Code style

- Match existing Tailwind + `fios-*` / `accent-*` tokens in `client/src/index.css`.
- Prefer Framer Motion + lucide-react patterns already used in the dashboard.
- Soft-fail optional integrations (RAG upload, gist export, prefs column) instead of crashing the UI.
