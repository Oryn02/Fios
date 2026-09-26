/**
 * Vercel serverless entry — mounts the Express study-engine app.
 * Rewrites in /vercel.json send `/api/*` here so tutor/generate/etc.
 * return JSON instead of the SPA HTML 404 page.
 */
import app from '../server/src/index.js';

export default app;
