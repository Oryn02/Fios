import { getGeminiKey } from '../lib/geminiKey';
import { apiUrl } from '../lib/apiBase';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export async function generateQuizFromNotes(notes: string): Promise<QuizQuestion[]> {
  const path = '/api/generate/quiz';
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: notes, apiKey: getGeminiKey() }),
  });

  const responseText = await response.text();

  if (!responseText) {
    throw new Error(`Server returned an empty response (Status ${response.status}).`);
  }

  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`Server returned non-JSON output (Status ${response.status}) for ${path}`);
  }

  if (!response.ok) {
    throw new Error(data.error || `Server error: ${response.status}`);
  }

  const questions = Array.isArray(data) ? data : data?.questions || [];

  if (questions.length === 0) {
    throw new Error('No quiz questions were returned from the server.');
  }

  return questions;
}

export const generateQuiz = generateQuizFromNotes;
export default generateQuizFromNotes;
