import { Router, Response } from 'express';
import multer from 'multer';
import { requireUser, type AuthedRequest } from '../middleware/requireUser.js';
import {
  parseCsvDeck,
  parseRemNote,
  parseNotionMarkdown,
  parseQuizletText,
  importQuizletUrl,
  parseApkg,
} from '../services/importers.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

/** POST /api/import/csv */
router.post('/csv', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }
    const title = String(req.body?.title || 'Imported CSV').trim() || 'Imported CSV';
    const result = parseCsvDeck(text, title);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'CSV import failed' });
  }
});

/** POST /api/import/remnote */
router.post('/remnote', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }
    const title = String(req.body?.title || 'Imported RemNote').trim() || 'Imported RemNote';
    const result = parseRemNote(text, title);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'RemNote import failed' });
  }
});

/** POST /api/import/notion */
router.post('/notion', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }
    const title = String(req.body?.title || 'Imported Notion').trim() || 'Imported Notion';
    const result = parseNotionMarkdown(text, title);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Notion import failed' });
  }
});

/** POST /api/import/quizlet — { url? } or { text? } */
router.post('/quizlet', requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const url = String(req.body?.url || '').trim();
    const text = String(req.body?.text || '').trim();
    const title = String(req.body?.title || 'Imported Quizlet').trim() || 'Imported Quizlet';
    if (url) {
      const result = await importQuizletUrl(url);
      res.json(result);
      return;
    }
    if (text) {
      const result = parseQuizletText(text, title);
      res.json({ ...result, source: 'quizlet' });
      return;
    }
    res.status(400).json({ error: 'url or text is required' });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Quizlet import failed' });
  }
});

/** POST /api/import/apkg — multipart file */
router.post('/apkg', requireUser, upload.single('file'), async (req: AuthedRequest, res: Response) => {
  try {
    const file = req.file;
    if (!file?.buffer?.length) {
      res.status(400).json({ error: 'file is required (.apkg)' });
      return;
    }
    const title =
      String(req.body?.title || file.originalname?.replace(/\.apkg$/i, '') || 'Imported Anki').trim() ||
      'Imported Anki';
    const result = await parseApkg(file.buffer, title);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Anki import failed' });
  }
});

export default router;
