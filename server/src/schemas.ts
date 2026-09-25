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

export const codeExamSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'A short, descriptive title for the coding challenge',
    },
    language: {
      type: Type.STRING,
      description: 'The programming language, one of: javascript, typescript, python, c',
    },
    examType: {
      type: Type.STRING,
      description: 'The challenge type: bug_fix, output_prediction, or logic_completion',
    },
    prompt: {
      type: Type.STRING,
      description: 'Clear instructions describing the task the student must complete',
    },
    starterCode: {
      type: Type.STRING,
      description: 'The code the student starts from (buggy code, snippet to trace, or incomplete function)',
    },
    solutionCode: {
      type: Type.STRING,
      description: 'The full correct solution code',
    },
    expectedOutput: {
      type: Type.STRING,
      description: 'For output_prediction challenges, the exact expected program output; otherwise an empty string',
    },
    explanation: {
      type: Type.STRING,
      description: 'A concise explanation of the correct solution and the key concept being tested',
    },
  },
  required: ['title', 'language', 'examType', 'prompt', 'starterCode', 'solutionCode', 'explanation'],
};

export const codeGradeSchema = {
  type: Type.OBJECT,
  properties: {
    correct: {
      type: Type.BOOLEAN,
      description: 'Whether the submitted solution correctly satisfies the challenge',
    },
    score: {
      type: Type.INTEGER,
      description: 'A score from 0 to 100 reflecting correctness and quality',
    },
    feedback: {
      type: Type.STRING,
      description: 'Constructive feedback explaining what is right or wrong and how to improve',
    },
  },
  required: ['correct', 'score', 'feedback'],
};