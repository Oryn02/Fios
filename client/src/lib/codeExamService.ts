import { supabase } from './supabase';
import type { CodeExam } from '../types/db';
import { IS_DEMO, demoCodeExams } from './demo';

let demoExamState: CodeExam[] = [...demoCodeExams];

export async function getCodeExams(): Promise<CodeExam[]> {
  if (IS_DEMO) return [...demoExamState];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('code_exams')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading code exams:', error);
    return [];
  }
  return (data as CodeExam[]) || [];
}

export async function saveCodeExam(exam: Partial<CodeExam>): Promise<CodeExam> {
  if (IS_DEMO) {
    const saved: CodeExam = {
      id: `demo-${Date.now()}`,
      user_id: 'demo',
      title: exam.title || 'Untitled Code Exam',
      language: exam.language || 'javascript',
      exam_type: exam.exam_type || 'bug_fix',
      prompt: exam.prompt || '',
      starter_code: exam.starter_code || '',
      solution_code: exam.solution_code || '',
      user_code: exam.user_code || '',
      module_code: exam.module_code || null,
      completed: exam.completed ?? false,
      created_at: new Date().toISOString(),
    };
    demoExamState = [saved, ...demoExamState];
    return saved;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required.');

  const { data, error } = await supabase
    .from('code_exams')
    .insert({
      user_id: user.id,
      title: exam.title || 'Untitled Code Exam',
      language: exam.language || 'javascript',
      exam_type: exam.exam_type || 'bug_fix',
      prompt: exam.prompt || '',
      starter_code: exam.starter_code || '',
      solution_code: exam.solution_code || '',
      user_code: exam.user_code || '',
      module_code: exam.module_code || null,
      completed: exam.completed ?? false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CodeExam;
}

export async function deleteCodeExam(id: string): Promise<void> {
  if (IS_DEMO) {
    demoExamState = demoExamState.filter((e) => e.id !== id);
    return;
  }
  const { error } = await supabase.from('code_exams').delete().eq('id', id);
  if (error) throw error;
}
