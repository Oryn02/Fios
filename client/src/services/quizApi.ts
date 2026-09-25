import { getGeminiKey } from '../lib/geminiKey';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export async function generateQuizFromNotes(notes: string): Promise<QuizQuestion[]> {
  const response = await fetch('/api/generate/quiz', {
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
  } catch (err) {
    throw new Error(`Server returned non-JSON output (Status ${response.status}): ${responseText.slice(0, 100)}`);
  }

  if (!response.ok) {
    throw new Error(data.error || `Server error: ${response.status}`);
  }

  // Handle both direct arrays or nested { questions: [...] }
  const questions = Array.isArray(data) ? data : data?.questions || [];

  if (questions.length === 0) {
    throw new Error('No quiz questions were returned from the server.');
  }

  return questions;
}

export const generateQuiz = generateQuizFromNotes;
export default generateQuizFromNotes;