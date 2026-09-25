import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { flashcardSchema, quizSchema } from './schemas.js';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY is missing from server/.env file');
}

const ai = new GoogleGenAI({ apiKey });

// Updated model string requested by the API error response
const MODEL_NAME = 'gemini-3.8-flash';

function cleanJsonResponse(rawText: string): string {
  return rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
}

export async function generateFlashcardsFromText(studyNotes: string) {
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Generate a set of study flashcards based on the following lecture notes:\n\n${studyNotes}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: flashcardSchema,
      systemInstruction: 'You are an expert study assistant. Create high-quality, concise study flashcards covering key concepts.',
    },
  });

  if (!response.text) {
    throw new Error('No text returned from Gemini model.');
  }

  const cleaned = cleanJsonResponse(response.text);
  return JSON.parse(cleaned);
}

export async function generateQuizFromText(studyNotes: string) {
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Generate a 5-question multiple-choice quiz based on the following lecture notes:\n\n${studyNotes}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: quizSchema,
      systemInstruction: 'You are an expert tutor. Create clear multiple choice questions with 4 distinct options.',
    },
  });

  if (!response.text) {
    throw new Error('No text returned from Gemini model.');
  }

  const cleaned = cleanJsonResponse(response.text);
  return JSON.parse(cleaned);
}