import { supabase } from './supabase';
import type { MCQQuiz, MCQQuestion } from '../types/db';
import { IS_DEMO, demoQuizzes } from './demo';

let demoQuizState: MCQQuiz[] = [...demoQuizzes];

export async function getQuizzes(): Promise<MCQQuiz[]> {
  if (IS_DEMO) return [...demoQuizState];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('mcq_quizzes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading quizzes:', error);
    throw new Error(error.message || 'Failed to load quizzes');
  }
  return (data as MCQQuiz[]) || [];
}

export async function getQuizById(id: string): Promise<MCQQuiz> {
  if (!id?.trim()) throw new Error('Quiz id is required');
  if (IS_DEMO) {
    const found = demoQuizState.find((q) => q.id === id);
    if (!found) throw new Error('Quiz not found');
    return found;
  }
  const { data, error } = await supabase.from('mcq_quizzes').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message || 'Failed to load quiz');
  if (!data) throw new Error('Quiz not found');
  return data as MCQQuiz;
}

export async function saveQuiz(
  title: string,
  questions: MCQQuestion[],
  moduleCode?: string | null
): Promise<MCQQuiz> {
  if (IS_DEMO) {
    const quiz: MCQQuiz = {
      id: `demo-${Date.now()}`,
      user_id: 'demo',
      title,
      questions,
      module_code: moduleCode || null,
      created_at: new Date().toISOString(),
    };
    demoQuizState = [quiz, ...demoQuizState];
    return quiz;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required.');

  const { data, error } = await supabase
    .from('mcq_quizzes')
    .insert({
      user_id: user.id,
      title: title.trim() || 'Untitled Quiz',
      questions,
      module_code: moduleCode || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as MCQQuiz;
}

export async function deleteQuiz(id: string): Promise<void> {
  if (IS_DEMO) {
    demoQuizState = demoQuizState.filter((q) => q.id !== id);
    return;
  }
  const { error } = await supabase.from('mcq_quizzes').delete().eq('id', id);
  if (error) throw error;
}
