import {GoogleGenAI, Type} from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

const flashcardSchema = {
    type: Type.OBJECT,
    properties: {
        title: {type: Type.STRING},
        cards: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                question: {type: Type.STRING},
                answer: {type: Type.STRING},
                defintion: {type: Type.STRING},
            },
            required: ['id', 'question', 'answer', 'definiton']
            },
        },
    },
    required: ['title', 'cards'],
};

const quizSchema = {
  type: Type.OBJECT,
  properties: {
    quizTitle: { type: Type.STRING },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          question: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          correctIndex: { type: Type.INTEGER },
          explanation: { type: Type.STRING },
        },
        required: ['id', 'question', 'options', 'correctIndex', 'explanation'],
      },
    },
  },
  required: ['quizTitle', 'questions'],
};

export async function generateFlashcardsFromText(studyNotes: string) {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Generate a set of study flashcards based on the following lecture notes:\n\n${studyNotes}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: flashcardSchema,
            systemInstruction: 'You are an expert study assistant. Create high-quality, concise study flashcards covering key definitions and core concepts.',
        },
    });

    return JSON.parse(response.text || '{}');
}

export async function generateQuizFromText(studyNotes: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Generate a multiple-choice quiz with 10-30 questions based on the following lecture notes:\n\n${studyNotes}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: quizSchema,
      systemInstruction: 'You are an expert tutor. Create clear multiple choice questions with 4 distinct options, 0-based correctIndex, and brief explanations.',
    },
  });

  return JSON.parse(response.text || '{}');
}