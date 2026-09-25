import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import {
  generateFlashcardsFromText,
  generateQuizFromText,
  generateCodeExam,
  gradeCodeSubmission,
  summarizeDocument,
  tutorAnswer,
  evaluateRecall,
} from './geminiService.js';

const router = Router();

// Per-request BYO Gemini key, sent by the client from the user's profile.
function apiKeyOf(req: Request): string | undefined {
  const headerKey = req.header('x-gemini-key');
  return (req.body && req.body.apiKey) || headerKey || undefined;
}

/* ==========================================================================
   1. FLASHCARDS GENERATION
   ========================================================================== */
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
const handleGenerateCodeExam = async (req: Request, res: Response) => {
  try {
    const { language, examType, topic, difficulty } = req.body || {};
    if (!language || !examType) {
      return res.status(400).json({ error: 'language and examType are required' });
    }

    const result = await generateCodeExam(language, examType, topic || '', difficulty || 'intermediate', apiKeyOf(req));
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
const handleSummarize = async (req: Request, res: Response) => {
  try {
    const text = req.body.text || req.body.content;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text content is required' });
    }
    const result = await summarizeDocument(text, apiKeyOf(req));
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
const handleTutor = async (req: Request, res: Response) => {
  try {
    const { question, context } = req.body || {};
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'question is required' });
    }
    const result = await tutorAnswer(question, context || '', apiKeyOf(req));
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
const handleICalProxy = async (req: Request, res: Response) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "url" query parameter.' });
    }

    // Convert webcal protocol to standard https
    const targetUrl = url.replace(/^webcal:\/\//i, 'https://');

    // Add browser spoof headers so ATU timetable server accepts request
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/calendar, text/plain, */*',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `ATU server responded with status code ${response.status}`,
      });
    }

    const icsData = await response.text();

    // Set as text/plain so the frontend fetch() reads it as a string instead of triggering browser download
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(icsData);
  } catch (error: any) {
    console.error('iCal Proxy Error:', error);
    return res.status(500).json({ error: 'Internal server error while proxying iCal feed.' });
  }
};

router.get('/ical-proxy', handleICalProxy);
router.get('/api/ical-proxy', handleICalProxy);

export default router;