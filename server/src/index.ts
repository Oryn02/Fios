import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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
 * Set CLIENT_ORIGIN to the static site URL(s), comma-separated.
 * Default: reflect request origin (dev-friendly).
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

// Dual mounting: Vite proxy + direct `/api/*` and bare paths both work
app.use('/api', routes);
app.use('/', routes);

// JSON 405 for unmatched methods on known prefixes (avoid HTML Method Not Allowed)
app.use('/api', (req, res) => {
  res.status(404).json({
    error: `No handler for ${req.method} ${req.originalUrl}`,
    hint: 'Check the Express routes on the Render Web Service.',
  });
});

/**
 * Always listen — required for Render Web Services.
 * (Older Vercel serverless imported the app without listening; that path is retired.)
 */
const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Fios API listening on http://0.0.0.0:${PORT}`);
});

export default app;
