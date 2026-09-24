import { Router, Request, Response } from 'express';
import { generateFlashcardsFromText, generateQuizFromText } from './geminiService.js';

const router = Router();

router.post('/generate/flashcards', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const result = await generateFlashcardsFromText(text);

    // Extract the cards array or default to empty array
    const cards = result?.cards || [];
    return res.json(cards);
  } catch (error) {
    console.error('Error generating flashcards:', error);
    return res.status(500).json({ error: 'Failed to generate flashcards from Gemini' });
  }
});

router.post('/generate/quiz', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const result = await generateQuizFromText(text);

    // Extract questions array or default to empty array
    const questions = result?.questions || [];
    return res.json(questions);
  } catch (error) {
    console.error('Error generating quiz:', error);
    return res.status(500).json({ error: 'Failed to generate quiz from Gemini' });
  }
});

export default router;