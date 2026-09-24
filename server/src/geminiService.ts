import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { flashcardSchema, quizSchema } from './schemas.js';

dotenv.config();

// Fallback check so process.env doesn't fail silently
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY is missing from server/.env file');
}

const ai = new GoogleGenAI({ apiKey });

export async function generateFlashcardsFromText(studyNotes: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: `Generate a set of study flashcards based on the following lecture notes:\n\n${studyNotes}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: flashcardSchema,
      systemInstruction: 'You are an expert study assistant. Create high-quality, concise study flashcards covering key concepts.',
    },
  });

  return JSON.parse(response.text || '{}');
}

export async function generateQuizFromText(studyNotes: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: `Generate a multiple-choice quiz based on the following lecture notes:\n\n${studyNotes}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: quizSchema,
      systemInstruction: 'You are an expert tutor. Create clear multiple choice questions with 4 distinct options.',
    },
  });

  return JSON.parse(response.text || '{}');
}