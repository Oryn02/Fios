import { Router, Request, Response } from 'express';
import {
  generateFlashcardsFromText,
  generateQuizFromText,
  generateCodeExam,
  gradeCodeSubmission,
} from './geminiService.js';

const router = Router();

/* ==========================================================================
   1. FLASHCARDS GENERATION
   ========================================================================== */
const handleFlashcards = async (req: Request, res: Response) => {
  try {
    const text = req.body.text || req.body.notes;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const result = await generateFlashcardsFromText(text);
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

    const result = await generateQuizFromText(text);
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

    const result = await generateCodeExam(language, examType, topic || '', difficulty || 'intermediate');
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

    const result = await gradeCodeSubmission(
      language || 'javascript',
      prompt || '',
      solutionCode || '',
      userCode
    );
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Code Exam Grading Error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to grade submission' });
  }
};

router.post('/grade/code-exam', handleGradeCodeExam);
router.post('/grade-code-exam', handleGradeCodeExam);

/* ==========================================================================
   5. ICAL / WEBCAL CORS PROXY ENDPOINT
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
        error: `ATU server responded with status code ${response.status}` 
      });
    }

    const icsData = await response.text();

    res.setHeader('Content-Type', 'text/calendar');
    return res.status(200).send(icsData);
  } catch (error: any) {
    console.error('iCal Proxy Error:', error);
    return res.status(500).json({ error: 'Internal server error while proxying iCal feed.' });
  }
};

router.get('/ical-proxy', handleICalProxy);
router.get('/api/ical-proxy', handleICalProxy);

export default router;