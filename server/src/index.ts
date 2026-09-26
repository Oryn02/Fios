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

app.use(cors());
// 15mb limit supports base64-encoded images/audio in JSON bodies
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Dual mounting guarantees Vite proxy hits the route handler
app.use('/api', routes);
app.use('/', routes);

// Only listen locally. Vercel imports this app directly as a serverless handler.
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
