import { postApiJson } from '../lib/apiClient';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export async function generateQuizFromNotes(notes: string): Promise<QuizQuestion[]> {
  const data = await postApiJson<QuizQuestion[] | { questions?: QuizQuestion[] }>('/api/generate/quiz', {
    text: notes,
  });
  const questions = Array.isArray(data) ? data : data?.questions || [];
  if (questions.length === 0) {
    throw new Error('No quiz questions were returned from the server.');
  }
  return questions;
}

export const generateQuiz = generateQuizFromNotes;
export default generateQuizFromNotes;
