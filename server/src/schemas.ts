import { Type } from '@google/genai';

export const flashcardSchema = {
  type: Type.OBJECT,
  properties: {
    title: { 
      type: Type.STRING,
      description: 'A concise title for the flashcard deck',
    },
    cards: {
      type: Type.ARRAY,
      description: 'List of generated flashcards',
      items: {
        type: Type.OBJECT,
        properties: {
          front: { 
            type: Type.STRING,
            description: 'Question, term, or code snippet prompt',
          },
          back: { 
            type: Type.STRING,
            description: 'Answer, definition, or code explanation',
          },
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
    quizTitle: { 
      type: Type.STRING,
      description: 'A short title summarizing the quiz topic',
    },
    questions: {
      type: Type.ARRAY,
      description: 'List of multiple choice practice questions',
      items: {
        type: Type.OBJECT,
        properties: {
          id: {
            type: Type.STRING,
            description: 'Unique question identifier (e.g., q1, q2)',
          },
          question: { 
            type: Type.STRING,
            description: 'The multiple-choice question text',
          },
          options: {
            type: Type.ARRAY,
            description: 'Array of exactly four multiple choice option strings',
            items: { type: Type.STRING },
          },
          correctIndex: { 
            type: Type.INTEGER,
            description: 'Zero-based index (0, 1, 2, or 3) of the correct option',
          },
          explanation: { 
            type: Type.STRING,
            description: 'Explanation detailing why the correct answer is right',
          },
        },
        required: ['id', 'question', 'options', 'correctIndex', 'explanation'],
      },
    },
  },
  required: ['quizTitle', 'questions'],
};