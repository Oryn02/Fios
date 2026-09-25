import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import {
  flashcardSchema,
  quizSchema,
  codeExamSchema,
  codeGradeSchema,
  summarySchema,
  recallSchema,
} from './schemas.js';

dotenv.config();

const serverApiKey = process.env.GEMINI_API_KEY;

// Updated model string requested by the API error response
const MODEL_NAME = 'gemini-3.8-flash';

/**
 * Resolve a Gemini client. Prefers a per-request (BYO) key supplied by the
 * user, then falls back to the server's configured key. Throws a clear error
 * if neither is available so the client can prompt the user for a key.
 */
function getClient(userApiKey?: string): GoogleGenAI {
  const apiKey = (userApiKey && userApiKey.trim()) || serverApiKey;
  if (!apiKey) {
    throw new Error('No Gemini API key available. Add your key in Settings (Bring Your Own Key).');
  }
  return new GoogleGenAI({ apiKey });
}

function cleanJsonResponse(rawText: string): string {
  return rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
}

export async function generateFlashcardsFromText(studyNotes: string, apiKey?: string) {
  const ai = getClient(apiKey);
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Generate a set of study flashcards based on the following lecture notes:\n\n${studyNotes}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: flashcardSchema,
      systemInstruction: 'You are an expert study assistant. Create high-quality, concise study flashcards covering key concepts.',
    },
  });

  if (!response.text) throw new Error('No text returned from Gemini model.');
  return JSON.parse(cleanJsonResponse(response.text));
}

export async function generateQuizFromText(studyNotes: string, apiKey?: string) {
  const ai = getClient(apiKey);
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Generate a 5-question multiple-choice quiz based on the following lecture notes:\n\n${studyNotes}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: quizSchema,
      systemInstruction: 'You are an expert tutor. Create clear multiple choice questions with 4 distinct options.',
    },
  });

  if (!response.text) throw new Error('No text returned from Gemini model.');
  return JSON.parse(cleanJsonResponse(response.text));
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
  difficulty: string = 'intermediate',
  apiKey?: string
) {
  const ai = getClient(apiKey);
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

  if (!response.text) throw new Error('No text returned from Gemini model.');
  return JSON.parse(cleanJsonResponse(response.text));
}

export async function gradeCodeSubmission(
  language: string,
  prompt: string,
  solutionCode: string,
  userCode: string,
  apiKey?: string
) {
  const ai = getClient(apiKey);
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

  if (!response.text) throw new Error('No text returned from Gemini model.');
  return JSON.parse(cleanJsonResponse(response.text));
}

export async function summarizeDocument(text: string, apiKey?: string) {
  const ai = getClient(apiKey);
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Summarize the following study material and extract the key glossary terms.\n\n${text}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: summarySchema,
      systemInstruction:
        'You are an expert study assistant. Produce a concise, well-structured summary and a glossary of the most important terms with clear definitions.',
    },
  });

  if (!response.text) throw new Error('No text returned from Gemini model.');
  return JSON.parse(cleanJsonResponse(response.text));
}

export async function evaluateRecall(topic: string, userText: string, context: string, apiKey?: string) {
  const ai = getClient(apiKey);
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `A student is practicing active recall ("blurting") on the topic "${topic}". Evaluate what they wrote against the reference material. Identify concepts they covered well, concepts that are vague/incomplete, and crucial points they omitted or got wrong. Give an overall accuracy 0-100.\n\n=== REFERENCE MATERIAL ===\n${context || '(no reference material provided — evaluate on general correctness for the topic)'}\n\n=== STUDENT RECALL ===\n${userText}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: recallSchema,
      systemInstruction:
        'You are a supportive exam coach. Grade free-recall attempts fairly. Mark each concept status as exactly "covered", "partial", or "missed".',
    },
  });

  if (!response.text) throw new Error('No text returned from Gemini model.');
  return JSON.parse(cleanJsonResponse(response.text));
}

export async function tutorAnswer(question: string, context: string, apiKey?: string) {
  const ai = getClient(apiKey);
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `You are helping a student understand their uploaded notes. Ground your answer in the provided material and say if something is not covered.\n\n=== NOTES ===\n${context}\n\n=== QUESTION ===\n${question}`,
    config: {
      systemInstruction:
        'You are Fios AI Tutor, a friendly, precise study tutor. Answer clearly and concisely based primarily on the provided notes. When explaining a process, flow, hierarchy, or architecture, include a Mermaid diagram inside a ```mermaid code block to visualize it.',
    },
  });

  if (!response.text) throw new Error('No text returned from Gemini model.');
  return { answer: response.text.trim() };
}
