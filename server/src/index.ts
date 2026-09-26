import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import routes from './routes.js';

// Load root .env then server/.env (local overrides). Never commit real secrets.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const app = express();

/**
 * CORS for split Render deploys (Static Site → Web Service).
 * Same-origin single-service deploys do not need CLIENT_ORIGIN.
 * Set CLIENT_ORIGIN to the static site URL(s), comma-separated.
 */
const clientOrigins = (process.env.CLIENT_ORIGIN || process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: clientOrigins.length
      ? (origin, cb) => {
          if (!origin || clientOrigins.includes(origin) || clientOrigins.includes('*')) {
            cb(null, true);
          } else {
            cb(null, false);
          }
        }
      : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-gemini-key'],
  })
);

// 15mb limit supports base64-encoded images/audio in JSON bodies
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'fios-api', version: '2.2.2' });
});
app.get('/api/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'fios-api', version: '2.2.2' });
});

// API routes first — never fall through to the SPA for /api/*
app.use('/api', routes);
// Dev convenience: also mount bare paths (Vite proxy hits /api already)
if (process.env.NODE_ENV !== 'production') {
  app.use('/', routes);
}

app.use('/api', (req, res) => {
  res.status(404).json({
    error: `No handler for ${req.method} ${req.originalUrl}`,
    hint: 'Check the Express routes on the Render Web Service.',
  });
});

/**
 * Optional SPA hosting for a single Render Web Service.
 * Looks for Vite build output at CLIENT_DIST or ../client/dist (monorepo root build).
 * Leave unset / missing → API-only (pair with a Static Site + VITE_API_URL).
 */
function resolveClientDist(): string | null {
  const candidates = [
    process.env.CLIENT_DIST,
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(__dirname, '../client/dist'),
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(process.cwd(), '../client/dist'),
  ].filter(Boolean) as string[];

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) return dir;
  }
  return null;
}

const clientDist = resolveClientDist();
if (clientDist) {
  console.log(`Serving Vite SPA from ${clientDist}`);
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
  // Express 5-safe SPA fallback (avoid legacy `*` path patterns)
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
} else {
  console.log('No client/dist found — API-only mode (set VITE_API_URL on a Static Site).');
}

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Fios listening on http://0.0.0.0:${PORT}`);
});

export default app;
