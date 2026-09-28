import { Router, Request, Response } from 'express';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import {
  generateFlashcardsFromText,
  generateQuizFromText,
  generateCodeExam,
  gradeCodeSubmission,
  summarizeDocument,
  summarizeWithChunks,
  tutorAnswer,
  evaluateRecall,
  processVisionOrAudio,
  chunkText,
  ragRetrieve,
} from './geminiService.js';
import { extractPdfTextFromBuffer } from './pdfText.js';
import {
  configureVapid,
  getVapidPublicKey,
  isVapidReady,
  saveSubscription,
  removeSubscription,
  sendTestPush,
  type PushSubscriptionJSON,
} from './pushService.js';

const router = Router();

/** Multer memory storage for PDF / note uploads (no disk writes). */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

/**
 * Resolve the per-request BYO Gemini key from body or `x-gemini-key` header.
 * @param req - Express request
 */
function apiKeyOf(req: Request): string | undefined {
  const headerKey = req.header('x-gemini-key');
  return (req.body && req.body.apiKey) || headerKey || undefined;
}

/**
 * Heuristic: does a buffer look like mostly printable UTF-8 text
 * (as opposed to a binary PDF starting with %PDF-)?
 */
function bufferLooksLikeText(buf: Buffer): boolean {
  if (!buf || buf.length === 0) return false;
  // Classic PDF magic — treat as binary
  if (buf.length >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-') {
    return false;
  }
  const sample = buf.subarray(0, Math.min(buf.length, 4096));
  let printable = 0;
  for (let i = 0; i < sample.length; i++) {
    const b = sample[i];
    if (b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127) || b >= 128) {
      printable++;
    }
  }
  return printable / sample.length >= 0.85;
}

/* ==========================================================================
   1. FLASHCARDS GENERATION
   ========================================================================== */

/**
 * POST /generate/flashcards | /generate-flashcards
 * Body: `{ text | notes, apiKey? }` → flashcard array / deck object.
 */
const handleFlashcards = async (req: Request, res: Response) => {
  try {
    const text = req.body.text || req.body.notes;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const result = await generateFlashcardsFromText(text, apiKeyOf(req));
    const cards = Array.isArray(result?.cards)
      ? result.cards
      : Array.isArray(result)
        ? result
        : [];
    // Always return a stable object shape so clients never call .cards on an array by mistake
    return res.status(200).json({
      title: typeof result?.title === 'string' ? result.title : undefined,
      cards,
    });
  } catch (error: any) {
    console.error('Flashcard Generation Error:', error);
    const message =
      error?.message && !String(error.message).includes('is not a function')
        ? error.message
        : 'Failed to generate flashcards. Check the Gemini model/key and try again.';
    return res.status(500).json({ error: message });
  }
};

router.post('/generate/flashcards', handleFlashcards);
router.post('/generate-flashcards', handleFlashcards);

/* ==========================================================================
   2. QUIZ GENERATION
   ========================================================================== */

/**
 * POST /generate/quiz | /generate-quiz
 * Body: `{ text | notes, questionCount?, apiKey? }` → MCQ question array.
 * `questionCount` defaults to 5, max 40.
 */
const handleQuiz = async (req: Request, res: Response) => {
  try {
    const text = req.body.text || req.body.notes;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const rawCount = req.body.questionCount ?? req.body.count ?? 5;
    const questionCount = Math.min(40, Math.max(1, Math.floor(Number(rawCount) || 5)));

    const result = await generateQuizFromText(text, apiKeyOf(req), questionCount);
    const questions = result?.questions || (Array.isArray(result) ? result : []);
    return res.status(200).json(questions);
  } catch (error: any) {
    console.error('Quiz Generation Error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate quiz questions' });
  }
};

router.post('/generate/quiz', handleQuiz);
router.post('/generate-quiz', handleQuiz);

/* ==========================================================================
   3. CODE EXAM GENERATION
   ========================================================================== */

/**
 * POST /generate/code-exam | /generate-code-exam
 * Body: `{ language, examType, topic?, difficulty?, customPrompt?, apiKey? }`
 * `customPrompt` is forwarded to the study engine for instructor overrides.
 */
const handleGenerateCodeExam = async (req: Request, res: Response) => {
  try {
    const { language, examType, topic, difficulty, customPrompt } = req.body || {};
    if (!language || !examType) {
      return res.status(400).json({ error: 'language and examType are required' });
    }

    const result = await generateCodeExam(
      language,
      examType,
      topic || '',
      difficulty || 'intermediate',
      apiKeyOf(req),
      customPrompt
    );
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Code Exam Generation Error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate code exam' });
  }
};

router.post('/generate/code-exam', handleGenerateCodeExam);
router.post('/generate-code-exam', handleGenerateCodeExam);

/* ==========================================================================
   4. CODE EXAM GRADING
   ========================================================================== */

/**
 * POST /grade/code-exam | /grade-code-exam
 * Body: `{ language, prompt, solutionCode, userCode, apiKey? }` → grade object.
 */
const handleGradeCodeExam = async (req: Request, res: Response) => {
  try {
    const { language, prompt, solutionCode, userCode } = req.body || {};
    if (!userCode || !userCode.trim()) {
      return res.status(400).json({ error: 'userCode is required' });
    }

    const result = await gradeCodeSubmission(language || 'javascript', prompt || '', solutionCode || '', userCode, apiKeyOf(req));
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Code Exam Grading Error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to grade submission' });
  }
};

router.post('/grade/code-exam', handleGradeCodeExam);
router.post('/grade-code-exam', handleGradeCodeExam);

/* ==========================================================================
   5. DOCUMENT SUMMARIZATION (PDF / NOTE PARSER)
   ========================================================================== */

/**
 * POST /summarize | /generate/summary
 * Body: `{ text | content, useChunks?, apiKey? }`
 * When `useChunks` is true (or text is very long), uses chunked summarization.
 */
const handleSummarize = async (req: Request, res: Response) => {
  try {
    const text = req.body.text || req.body.content;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text content is required' });
    }
    const useChunks = !!req.body.useChunks || String(text).split(/\s+/).length > 1200;
    const result = useChunks
      ? await summarizeWithChunks(text, apiKeyOf(req))
      : await summarizeDocument(text, apiKeyOf(req));
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Summarize Error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to summarize document' });
  }
};

router.post('/summarize', handleSummarize);
router.post('/generate/summary', handleSummarize);

/* ==========================================================================
   6. AI TUTOR (grounded chat)
   ========================================================================== */

/**
 * POST /tutor
 * Body: `{ question, context?, ragContext?: string[], apiKey? }`
 * `ragContext` is an optional array of retrieved passages injected ahead of notes.
 */
const handleTutor = async (req: Request, res: Response) => {
  try {
    const { question, context, ragContext } = req.body || {};
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'question is required' });
    }
    const rag =
      Array.isArray(ragContext) ? ragContext.filter((c: unknown) => typeof c === 'string') : undefined;
    const result = await tutorAnswer(question, context || '', apiKeyOf(req), rag);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Tutor Error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to get tutor response' });
  }
};

router.post('/tutor', handleTutor);

/* ==========================================================================
   6b. ACTIVE RECALL EVALUATOR ("blurting")
   ========================================================================== */

/**
 * POST /active-recall
 * Body: `{ topic?, userText, context?, apiKey? }` → accuracy + concept statuses.
 */
router.post('/active-recall', async (req: Request, res: Response) => {
  try {
    const { topic, userText, context } = req.body || {};
    if (!userText || !userText.trim()) {
      return res.status(400).json({ error: 'userText is required' });
    }
    const result = await evaluateRecall(topic || '', userText, context || '', apiKeyOf(req));
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Active Recall Error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to evaluate recall' });
  }
});

/* ==========================================================================
   7. VALIDATE GEMINI API KEY (BYO Key)
   ========================================================================== */

/**
 * POST /validate-key
 * Body/header: `apiKey` or `x-gemini-key` → `{ valid: boolean }`.
 */
router.post('/validate-key', async (req: Request, res: Response) => {
  try {
    const key = (req.body && req.body.apiKey) || req.header('x-gemini-key');
    if (!key || !String(key).trim()) {
      return res.status(400).json({ valid: false, error: 'apiKey is required' });
    }
    const ai = new GoogleGenAI({ apiKey: String(key).trim() });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Reply with the single word: OK',
    });
    const ok = !!response.text;
    return res.status(200).json({ valid: ok });
  } catch (error: any) {
    return res.status(200).json({ valid: false, error: error?.message || 'Invalid API key' });
  }
});

/* ==========================================================================
   8. ICAL / WEBCAL CORS PROXY ENDPOINT
   ========================================================================== */

/**
 * GET|POST /ical-proxy
 * - GET  ?url=...
 * - POST { url } (preferred — avoids long-query issues)
 * Proxies an iCal/WebCAL feed with browser-spoof headers for ATU timetables.
 */
const handleICalProxy = async (req: Request, res: Response) => {
  try {
    const rawUrl =
      (typeof req.body?.url === 'string' && req.body.url.trim()) ||
      (typeof req.query.url === 'string' && req.query.url.trim()) ||
      '';

    if (!rawUrl) {
      return res.status(400).json({
        error: 'Missing or invalid "url". Pass ?url= on GET or JSON { "url" } on POST.',
      });
    }

    // Convert webcal protocol to standard https
    const targetUrl = rawUrl.replace(/^webcal:\/\//i, 'https://');

    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid calendar URL.' });
    }

    if (!/^https?:$/i.test(parsed.protocol)) {
      return res.status(400).json({ error: 'Calendar URL must be http(s) or webcal.' });
    }

    // Add browser spoof headers so ATU timetable server accepts request
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/calendar, text/plain, */*',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Timetable upstream responded with status code ${response.status}`,
      });
    }

    const icsData = await response.text();
    if (!/BEGIN:VCALENDAR/i.test(icsData)) {
      return res.status(502).json({
        error: 'Upstream response was not a valid iCalendar (VCALENDAR) feed.',
      });
    }

    // Set as text/plain so the frontend fetch() reads it as a string instead of triggering browser download
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(icsData);
  } catch (error: any) {
    console.error('iCal Proxy Error:', error);
    return res.status(500).json({ error: 'Internal server error while proxying iCal feed.' });
  }
};

router.get('/ical-proxy', handleICalProxy);
router.post('/ical-proxy', handleICalProxy);
router.get('/api/ical-proxy', handleICalProxy);
router.post('/api/ical-proxy', handleICalProxy);

/* ==========================================================================
   9. PDF UPLOAD (multipart) — fixes prior 405 on POST /upload/pdf
   ========================================================================== */

/**
 * POST /upload/pdf
 *
 * Accepts multipart form-data with:
 * - `file` (optional): PDF or text buffer via multer memory storage
 * - `text` (optional): client-extracted plain text (preferred when available)
 * - `title` (optional): document title
 *
 * Resolution order:
 * 1. If `text` field is provided → use it (200)
 * 2. Else if uploaded buffer looks like UTF-8 text → decode and use it (200)
 * 3. Else if buffer is a binary PDF → extract text server-side with pdf.js (200)
 * 4. Else return 400 (still a valid POST — never 405)
 *
 * Dual-mounted under `/api/upload/pdf` via `index.ts`.
 * Enables iPhone / Android Files picker uploads without client-only PDF.js.
 */
const handleUploadPdf = async (req: Request, res: Response) => {
  try {
    const title =
      (typeof req.body?.title === 'string' && req.body.title.trim()) ||
      (req.file?.originalname ? req.file.originalname.replace(/\.pdf$/i, '') : 'Untitled PDF');

    const bodyText =
      typeof req.body?.text === 'string' && req.body.text.trim() ? req.body.text.trim() : '';

    if (bodyText) {
      return res.status(200).json({
        ok: true,
        title,
        text: bodyText,
        source: 'client-text',
        bytes: req.file?.size ?? 0,
      });
    }

    if (req.file?.buffer && bufferLooksLikeText(req.file.buffer)) {
      const text = req.file.buffer.toString('utf8').trim();
      if (text) {
        return res.status(200).json({
          ok: true,
          title,
          text,
          source: 'buffer-utf8',
          bytes: req.file.size,
        });
      }
    }

    if (req.file?.buffer?.length) {
      const isPdfMagic =
        req.file.buffer.length >= 5 &&
        req.file.buffer.subarray(0, 5).toString('ascii') === '%PDF-';
      const nameLooksPdf = /\.pdf$/i.test(req.file.originalname || '');
      if (isPdfMagic || nameLooksPdf || req.file.mimetype === 'application/pdf') {
        try {
          const text = await extractPdfTextFromBuffer(req.file.buffer);
          if (text.trim()) {
            return res.status(200).json({
              ok: true,
              title,
              text: text.trim(),
              source: 'server-pdfjs',
              bytes: req.file.size,
              pagesHint: true,
            });
          }
          return res.status(422).json({
            ok: false,
            error:
              'PDF uploaded but no extractable text was found (it may be image-only / scanned). Try a text PDF, paste notes, or upload a photo of the page for Vision.',
            title,
            bytes: req.file.size,
            receivedFile: true,
          });
        } catch (extractErr: any) {
          console.error('Server PDF extract failed:', extractErr);
          return res.status(422).json({
            ok: false,
            error:
              extractErr?.message ||
              'Could not parse this PDF on the server. Try another file, paste text, or upload an image for Vision.',
            title,
            bytes: req.file.size,
            receivedFile: true,
          });
        }
      }
    }

    return res.status(400).json({
      ok: false,
      error:
        'No extractable content. Upload a PDF/TXT file, or send multipart fields `file` + `text`.',
      hint: 'iOS/Android: use Files or Photos; PDFs are parsed on the server when needed.',
      title,
      bytes: req.file?.size ?? 0,
      receivedFile: !!req.file,
    });
  } catch (error: any) {
    console.error('PDF Upload Error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to process PDF upload' });
  }
};

router.post('/upload/pdf', upload.single('file'), handleUploadPdf);

/**
 * POST /upload/notes
 * Body (JSON): `{ text, title? }` — plain-text note ingest for clarity vs PDF upload.
 */
const handleUploadNotes = async (req: Request, res: Response) => {
  try {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }
    const title =
      (typeof req.body?.title === 'string' && req.body.title.trim()) || 'Untitled Notes';
    return res.status(200).json({ ok: true, title, text, source: 'notes-json' });
  } catch (error: any) {
    console.error('Notes Upload Error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to process notes upload' });
  }
};

router.post('/upload/notes', handleUploadNotes);

/* ==========================================================================
   10. VISION / AUDIO → STRUCTURED NOTES
   ========================================================================== */

/**
 * POST /vision
 * Body: `{ imageBase64 | mediaBase64, mimeType?, apiKey? }`
 * Defaults mimeType to `image/png`. Returns `{ title, markdown, codeBlocks? }`.
 */
const handleVision = async (req: Request, res: Response) => {
  try {
    const mediaBase64 = req.body?.imageBase64 || req.body?.mediaBase64;
    const mimeType = req.body?.mimeType || 'image/png';
    if (!mediaBase64 || typeof mediaBase64 !== 'string') {
      return res.status(400).json({ error: 'imageBase64 (or mediaBase64) is required' });
    }
    const result = await processVisionOrAudio(mediaBase64, mimeType, apiKeyOf(req));
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Vision Error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to process image' });
  }
};

router.post('/vision', handleVision);

/**
 * POST /audio-transcribe
 * Body: `{ audioBase64 | mediaBase64, mimeType?, apiKey? }`
 * Defaults mimeType to `audio/webm`. Returns structured Markdown notes.
 */
const handleAudioTranscribe = async (req: Request, res: Response) => {
  try {
    const mediaBase64 = req.body?.audioBase64 || req.body?.mediaBase64;
    const mimeType = req.body?.mimeType || 'audio/webm';
    if (!mediaBase64 || typeof mediaBase64 !== 'string') {
      return res.status(400).json({ error: 'audioBase64 (or mediaBase64) is required' });
    }
    const result = await processVisionOrAudio(mediaBase64, mimeType, apiKeyOf(req));
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Audio Transcribe Error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to process audio' });
  }
};

router.post('/audio-transcribe', handleAudioTranscribe);

/**
 * POST /media/process
 * Combined vision/audio endpoint.
 * Body: `{ mediaBase64, mimeType, apiKey? }` — mimeType required (image/* or audio/*).
 */
const handleMediaProcess = async (req: Request, res: Response) => {
  try {
    const { mediaBase64, mimeType } = req.body || {};
    if (!mediaBase64 || typeof mediaBase64 !== 'string') {
      return res.status(400).json({ error: 'mediaBase64 is required' });
    }
    if (!mimeType || typeof mimeType !== 'string') {
      return res.status(400).json({ error: 'mimeType is required (e.g. image/png, audio/webm)' });
    }
    const result = await processVisionOrAudio(mediaBase64, mimeType, apiKeyOf(req));
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Media Process Error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to process media' });
  }
};

router.post('/media/process', handleMediaProcess);

/* ==========================================================================
   11. RAG QUERY (keyword / TF retrieval over chunks)
   ========================================================================== */

/**
 * POST /rag/query
 *
 * Body options:
 * - `{ text, query, topK?, targetWords?, overlapWords?, apiKey? }` — server chunks `text` then retrieves
 * - `{ chunks: string[], query, topK?, apiKey? }` — retrieve over pre-chunked passages
 *
 * Returns `{ query, chunks, scores }` where chunks are top-k texts ranked by TF/keyword score.
 */
const handleRagQuery = async (req: Request, res: Response) => {
  try {
    const { query, text, chunks: inputChunks, topK, targetWords, overlapWords } = req.body || {};
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'query is required' });
    }

    let chunks: string[];
    if (Array.isArray(inputChunks) && inputChunks.every((c: unknown) => typeof c === 'string')) {
      chunks = inputChunks as string[];
    } else if (typeof text === 'string' && text.trim()) {
      chunks = chunkText(text, targetWords || 500, overlapWords || 50);
    } else {
      return res.status(400).json({ error: 'Provide either `text` or `chunks` (string[])' });
    }

    const k = typeof topK === 'number' && topK > 0 ? Math.min(topK, 20) : 5;
    const result = await ragRetrieve(chunks, query.trim(), apiKeyOf(req), k);
    return res.status(200).json({
      query: query.trim(),
      chunks: result.chunks,
      scores: result.scores,
      totalChunks: chunks.length,
    });
  } catch (error: any) {
    console.error('RAG Query Error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to run RAG query' });
  }
};

router.post('/rag/query', handleRagQuery);

/* ==========================================================================
   SUPPORT MESSAGE → email provider (Resend / SendGrid)
   ========================================================================== */

/**
 * POST /support
 * Body: `{ message, name?, replyTo? }`
 * Delivers to SUPPORT_EMAIL when RESEND_API_KEY or SENDGRID_API_KEY is set.
 * Returns 503 with a clear error when the provider/inbox is unconfigured (no crash).
 */
router.post('/support', async (req: Request, res: Response) => {
  try {
    const { message, name, replyTo } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }
    if (message.trim().length < 10) {
      return res.status(400).json({ error: 'message is too short' });
    }
    if (message.length > 4000) {
      return res.status(400).json({ error: 'message is too long (max 4000 characters)' });
    }
    if (replyTo && typeof replyTo === 'string' && replyTo.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo.trim())) {
        return res.status(400).json({ error: 'replyTo email is invalid' });
      }
    }

    const { sendSupportEmail } = await import('./supportEmail.js');
    const result = await sendSupportEmail({
      message: String(message),
      name: typeof name === 'string' ? name : undefined,
      replyTo: typeof replyTo === 'string' ? replyTo : undefined,
    });

    if (result.unconfigured) {
      return res.status(503).json({ error: result.error, unconfigured: true });
    }
    if (!result.ok) {
      return res.status(502).json({ error: result.error || 'Failed to deliver support message' });
    }
    return res.status(200).json({ ok: true, provider: result.provider, id: result.id });
  } catch (error: any) {
    console.error('Support message error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to send support message' });
  }
});

/**
 * Admin-only feedback inbox.
 * Requires `Authorization: Bearer <supabase_access_token>` and
 * `ADMIN_UID` (or `VITE_ADMIN_UID`) matching the JWT subject. Returns 403 otherwise.
 * Also needs `SUPABASE_URL` + `SUPABASE_ANON_KEY` so the server can validate the user
 * and query `feedback` under the caller's JWT (RLS: fios_admins).
 */
async function requireAdminUid(req: Request, res: Response): Promise<string | null> {
  const adminUid = String(process.env.ADMIN_UID || process.env.VITE_ADMIN_UID || '').trim();
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const anon = String(process.env.SUPABASE_ANON_KEY || '').trim();

  if (!adminUid || !token) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  if (!supabaseUrl || !anon) {
    res.status(503).json({ error: 'Admin API not configured (SUPABASE_URL / SUPABASE_ANON_KEY).' });
    return null;
  }

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anon },
    });
    if (!userRes.ok) {
      res.status(403).json({ error: 'Forbidden' });
      return null;
    }
    const user = (await userRes.json()) as { id?: string };
    if (!user?.id || user.id !== adminUid) {
      res.status(403).json({ error: 'Forbidden' });
      return null;
    }
    return token;
  } catch {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
}

router.get('/admin/feedback', async (req: Request, res: Response) => {
  const token = await requireAdminUid(req, res);
  if (!token) return;

  const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const anon = String(process.env.SUPABASE_ANON_KEY || '').trim();

  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/feedback?select=*&order=created_at.desc&limit=200`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: anon,
        },
      }
    );
    if (r.status === 401 || r.status === 403) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!r.ok) {
      const body = await r.text();
      return res.status(502).json({ error: 'Failed to load feedback', detail: body.slice(0, 200) });
    }
    const rows = await r.json();
    return res.status(200).json({ feedback: rows });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Admin feedback failed' });
  }
});

/**
 * DELETE /api/admin/feedback/:id
 * Hard-delete one feedback row under the caller's JWT (RLS / admin RPC).
 */
router.delete('/admin/feedback/:id', async (req: Request, res: Response) => {
  const token = await requireAdminUid(req, res);
  if (!token) return;

  const id = String(req.params.id || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: 'Invalid feedback id' });
  }

  const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const anon = String(process.env.SUPABASE_ANON_KEY || '').trim();

  try {
    // Prefer SECURITY DEFINER RPC when present (v3.1.9+).
    const rpc = await fetch(`${supabaseUrl}/rest/v1/rpc/admin_delete_feedback`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anon,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ p_id: id }),
    });

    if (rpc.ok) {
      const body = await rpc.json();
      if (body === id || body === null) {
        return res.status(200).json({ ok: true, id, via: 'rpc' });
      }
      return res.status(200).json({ ok: true, id: body, via: 'rpc' });
    }

    // Fall back to direct DELETE + RETURNING when RPC is not installed yet.
    if (rpc.status !== 404 && rpc.status !== 400) {
      const detail = (await rpc.text()).slice(0, 300);
      // 400 from PostgREST often means missing RPC — try table delete below.
      if (!/Could not find the function|PGRST202/i.test(detail)) {
        return res.status(502).json({ error: 'Delete failed', detail });
      }
    }

    const del = await fetch(
      `${supabaseUrl}/rest/v1/feedback?id=eq.${encodeURIComponent(id)}&select=id`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: anon,
          Prefer: 'return=representation',
        },
      }
    );
    if (del.status === 401 || del.status === 403) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!del.ok) {
      const body = await del.text();
      return res.status(502).json({ error: 'Delete failed', detail: body.slice(0, 200) });
    }
    const rows = (await del.json()) as Array<{ id?: string }>;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(409).json({
        error:
          'Delete blocked by RLS — run supabase/v3.1.9-feedback-admin-delete.sql and ensure fios_admins membership.',
      });
    }
    return res.status(200).json({ ok: true, id: rows[0]?.id || id, via: 'delete' });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Admin feedback delete failed' });
  }
});

/**
 * POST /api/admin/feedback/delete
 * Body: `{ ids: string[] }` — bulk hard-delete under caller JWT.
 */
router.post('/admin/feedback/delete', async (req: Request, res: Response) => {
  const token = await requireAdminUid(req, res);
  if (!token) return;

  const ids = Array.isArray(req.body?.ids)
    ? (req.body.ids as unknown[]).map((x) => String(x || '').trim()).filter(Boolean)
    : [];
  if (ids.length === 0) {
    return res.status(400).json({ error: 'ids required' });
  }
  if (ids.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) {
    return res.status(400).json({ error: 'Invalid feedback id in ids' });
  }

  const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const anon = String(process.env.SUPABASE_ANON_KEY || '').trim();

  try {
    const rpc = await fetch(`${supabaseUrl}/rest/v1/rpc/admin_delete_feedback_ids`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anon,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ p_ids: ids }),
    });

    if (rpc.ok) {
      const body = await rpc.json();
      const deleted = Array.isArray(body) ? body : [];
      return res.status(200).json({ ok: true, deleted, via: 'rpc' });
    }

    const detail = (await rpc.text()).slice(0, 300);
    if (rpc.status !== 404 && rpc.status !== 400 && !/Could not find the function|PGRST202/i.test(detail)) {
      return res.status(502).json({ error: 'Bulk delete failed', detail });
    }

    const inList = `(${ids.map((id) => `"${id}"`).join(',')})`;
    const del = await fetch(
      `${supabaseUrl}/rest/v1/feedback?id=in.${inList}&select=id`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: anon,
          Prefer: 'return=representation',
        },
      }
    );
    if (del.status === 401 || del.status === 403) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!del.ok) {
      const body = await del.text();
      return res.status(502).json({ error: 'Bulk delete failed', detail: body.slice(0, 200) });
    }
    const rows = (await del.json()) as Array<{ id: string }>;
    const deleted = (rows || []).map((r) => r.id).filter(Boolean);
    if (deleted.length === 0) {
      return res.status(409).json({
        error:
          'Bulk delete blocked by RLS — run supabase/v3.1.9-feedback-admin-delete.sql and ensure fios_admins membership.',
      });
    }
    return res.status(200).json({ ok: true, deleted, via: 'delete' });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Admin feedback bulk delete failed' });
  }
});

/* ==========================================================================
   WEB PUSH (class reminders)
   ========================================================================== */

/**
 * GET /api/push/vapid-public-key
 * Returns the public VAPID key for PushManager.subscribe, or 503 if unset.
 */
router.get('/push/vapid-public-key', (_req: Request, res: Response) => {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return res.status(503).json({
      error: 'Web Push is not configured',
      hint: 'Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT on the Render Web Service.',
    });
  }
  return res.status(200).json({ publicKey });
});

/**
 * POST /api/push/subscribe
 * Body: PushSubscription JSON `{ endpoint, keys: { p256dh, auth } }`
 * Stored in-memory (ephemeral). See supabase/schema.sql for optional persistence.
 */
router.post('/push/subscribe', (req: Request, res: Response) => {
  try {
    const sub = req.body as PushSubscriptionJSON;
    saveSubscription(sub);
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || 'Invalid subscription' });
  }
});

/**
 * POST /api/push/unsubscribe
 * Body: `{ endpoint }`
 */
router.post('/push/unsubscribe', (req: Request, res: Response) => {
  const endpoint = String(req.body?.endpoint || '').trim();
  if (!endpoint) {
    return res.status(400).json({ error: 'endpoint is required' });
  }
  removeSubscription(endpoint);
  return res.status(200).json({ ok: true });
});

/**
 * POST /api/push/test
 * Body: PushSubscription JSON — sends a one-shot test notification via VAPID.
 */
router.post('/push/test', async (req: Request, res: Response) => {
  configureVapid();
  if (!isVapidReady()) {
    return res.status(503).json({
      error: 'VAPID keys not configured',
      hint: 'Generate keys with `npx web-push generate-vapid-keys` and set them on Render.',
    });
  }
  try {
    const sub = req.body as PushSubscriptionJSON;
    if (!sub?.endpoint || !sub?.keys) {
      return res.status(400).json({ error: 'Push subscription body is required' });
    }
    saveSubscription(sub);
    await sendTestPush(sub);
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('Push test error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to send test push' });
  }
});

export default router;
