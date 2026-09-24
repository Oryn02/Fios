import { Type } from '@google/genai';

export const flashcardSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    cards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          front: { type: Type.STRING },
          back: { type: Type.STRING },
        },
        required: ['front', 'back'],
      },
    },
  },
  required: ['title', 'cards'],
};

export const quizSchema = {
  type: Type.OBJECT,
  properties: {
    quizTitle: { type: Type.STRING },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          correctIndex: { type: Type.NUMBER },
          explanation: { type: Type.STRING },
        },
        required: ['question', 'options', 'correctIndex', 'explanation'],
      },
    },
  },
  required: ['quizTitle', 'questions'],
};