import { getGeminiKey } from '../lib/geminiKey';
import { apiUrl } from '../lib/apiBase';
import { fetchWithGeminiTimeout, friendlyGeminiError } from '../lib/geminiUx';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export async function generateQuizFromNotes(
  notes: string,
  questionCount: number = 5
): Promise<QuizQuestion[]> {
  const path = '/api/generate/quiz';
  const count = Math.min(40, Math.max(1, Math.floor(Number(questionCount) || 5)));
  const response = await fetchWithGeminiTimeout(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: notes, questionCount: count, apiKey: getGeminiKey() }),
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
    throw new Error(friendlyGeminiError(data.error || `Server error: ${response.status}`));
  }

  const questions = Array.isArray(data) ? data : data?.questions || [];

  if (questions.length === 0) {
    throw new Error('No quiz questions were returned from the server.');
  }

  return questions;
}

export const generateQuiz = generateQuizFromNotes;
export default generateQuizFromNotes;
