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
    const cards = result?.cards || (Array.isArray(result) ? result : []);
    return res.status(200).json(cards);
  } catch (error: any) {
    console.error('Flashcard Generation Error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate flashcards' });
  }
};

router.post('/generate/flashcards', handleFlashcards);
router.post('/generate-flashcards', handleFlashcards);

/* ==========================================================================
   2. QUIZ GENERATION
   ========================================================================== */

/**
 * POST /generate/quiz | /generate-quiz
 * Body: `{ text | notes, apiKey? }` → MCQ question array.
 */
const handleQuiz = async (req: Request, res: Response) => {
  try {
    const text = req.body.text || req.body.notes;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const result = await generateQuizFromText(text, apiKeyOf(req));
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
 * Proxies iCal/WebCal feeds (ATU StudentSet etc.) server-side to avoid browser CORS.
 * Query `?url=` or JSON/body `{ url }`.
 */
const handleICalProxy = async (req: Request, res: Response) => {
  try {
    const { validateIcalUrl } = await import('./icalProxy.js');
    const rawUrl =
      (typeof req.query.url === 'string' && req.query.url) ||
      (typeof req.body?.url === 'string' && req.body.url) ||
      '';

    const checked = validateIcalUrl(rawUrl);
    if (!checked.ok || !checked.url) {
      return res.status(400).json({ error: checked.error || 'Invalid timetable URL.' });
    }

    const targetUrl = checked.url;
    let upstream: globalThis.Response;
    try {
      upstream = await globalThis.fetch(targetUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/calendar, text/plain, application/ics, */*',
          'Accept-Language': 'en-IE,en;q=0.9',
        },
      });
    } catch (netErr: any) {
      console.error('iCal upstream network error:', netErr?.message || netErr);
      return res.status(502).json({
        error: `Could not reach timetable host (${new URL(targetUrl).hostname}). Check the URL or try again later.`,
      });
    }

    if (!upstream.ok) {
      return res.status(upstream.status === 404 ? 404 : 502).json({
        error:
          upstream.status === 404
            ? 'Timetable feed not found (404). Confirm your studentSetID is still valid on timetables.atu.ie.'
            : `Timetable host responded with HTTP ${upstream.status}.`,
      });
    }

    const icsData = await upstream.text();
    if (!icsData || !/BEGIN:VCALENDAR/i.test(icsData)) {
      return res.status(502).json({
        error: 'Upstream response was not a valid iCalendar (missing BEGIN:VCALENDAR).',
      });
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'private, max-age=120');
    return res.status(200).send(icsData);
  } catch (error: any) {
    console.error('iCal Proxy Error:', error);
    return res.status(500).json({
      error: error?.message || 'Internal server error while proxying iCal feed.',
    });
  }
};

router.get('/ical-proxy', handleICalProxy);
router.post('/ical-proxy', handleICalProxy);

/* ==========================================================================
   9. PDF UPLOAD (multipart) — fixes prior 405 on POST /upload/pdf
   ========================================================================== */

/**
 * POST /upload/pdf
 *
 * Accepts multipart form-data with:
 * - `file` (optional): PDF or text buffer via multer memory storage
 * - `text` (optional): client-extracted plain text (preferred for binary PDFs)
 * - `title` (optional): document title
 *
 * Resolution order:
 * 1. If `text` field is provided → use it (200)
 * 2. Else if uploaded buffer looks like UTF-8 text → decode and use it (200)
 * 3. Else return 400 asking the client to also send extracted text
 *    (still a valid POST — never 405)
 *
 * Dual-mounted under `/api/upload/pdf` via `index.ts`.
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

    // Binary PDF without client-extracted text — valid POST, ask for extraction
    return res.status(400).json({
      ok: false,
      error:
        'Binary PDF received without extracted text. Extract text client-side (e.g. pdf.js) and re-POST with multipart fields `file` + `text`, or send JSON `{ text, title }` to POST /upload/notes.',
      hint: 'Include the optional `text` field with the extracted content.',
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
   12. SUPPORT MESSAGE → email provider (Resend / SendGrid)
   ========================================================================== */

/**
 * POST /support
 * Body: `{ message, name?, replyTo? }`
 * Delivers to SUPPORT_EMAIL when RESEND_API_KEY or SENDGRID_API_KEY is set.
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

export default router;
