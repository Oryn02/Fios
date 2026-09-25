import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { flashcardSchema, quizSchema, codeExamSchema, codeGradeSchema } from './schemas.js';

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

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  c: 'C',
};

const EXAM_TYPE_INSTRUCTIONS: Record<string, string> = {
  bug_fix: 'Write a short program that contains a single, realistic bug. The student must find and fix it. starterCode must contain the buggy version; solutionCode must contain the corrected version.',
  output_prediction: 'Write a short, self-contained program. The student must predict its exact console output. starterCode must contain the program to trace; expectedOutput must contain the exact output; solutionCode may repeat the program.',
  logic_completion: 'Write a function with a clearly described goal but missing core logic (use a TODO comment). The student must complete it. starterCode must contain the incomplete function; solutionCode must contain the complete function.',
};

export async function generateCodeExam(
  language: string,
  examType: string,
  topic: string,
  difficulty: string = 'intermediate'
) {
  const langLabel = LANGUAGE_LABELS[language] || 'JavaScript';
  const typeInstruction = EXAM_TYPE_INSTRUCTIONS[examType] || EXAM_TYPE_INSTRUCTIONS.bug_fix;
  const topicClause = topic?.trim()
    ? `Focus the challenge on this topic: "${topic.trim()}".`
    : 'Pick a common, practical topic for the language.';

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Create a ${difficulty} ${langLabel} coding challenge of type "${examType}". ${typeInstruction} ${topicClause}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: codeExamSchema,
      systemInstruction:
        'You are an expert programming instructor. Produce concise, self-contained coding challenges. Return well-formatted, runnable code in the requested language only.',
    },
  });

  if (!response.text) {
    throw new Error('No text returned from Gemini model.');
  }

  return JSON.parse(cleanJsonResponse(response.text));
}

export async function gradeCodeSubmission(
  language: string,
  prompt: string,
  solutionCode: string,
  userCode: string
) {
  const langLabel = LANGUAGE_LABELS[language] || 'JavaScript';

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Grade this ${langLabel} submission.\n\nChallenge:\n${prompt}\n\nReference solution:\n\`\`\`\n${solutionCode}\n\`\`\`\n\nStudent submission:\n\`\`\`\n${userCode}\n\`\`\`\n\nEvaluate correctness against the challenge goal (not exact string match). Award partial credit for close attempts.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: codeGradeSchema,
      systemInstruction:
        'You are a fair, encouraging code reviewer. Judge whether the student solution satisfies the challenge and provide actionable feedback.',
    },
  });

  if (!response.text) {
    throw new Error('No text returned from Gemini model.');
  }

  return JSON.parse(cleanJsonResponse(response.text));
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