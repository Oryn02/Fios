import { supabase } from './supabase';
import type { Grade } from '../types/db';
import { IS_DEMO, demoGrades } from './demo';

let demoGradeState: Grade[] = [...demoGrades];

export async function getGrades(): Promise<Grade[]> {
  if (IS_DEMO) return [...demoGradeState];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('grades')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading grades:', error);
    return [];
  }
  return (data as Grade[]) || [];
}

export async function saveGrade(grade: Partial<Grade>): Promise<Grade> {
  if (IS_DEMO) {
    const saved: Grade = {
      id: `demo-${Date.now()}`,
      user_id: 'demo',
      title: grade.title || 'Assessment',
      weight: grade.weight ?? 0,
      score: grade.score ?? null,
      target_grade: grade.target_grade ?? 40,
      module_code: grade.module_code || null,
      created_at: new Date().toISOString(),
    };
    demoGradeState = [...demoGradeState, saved];
    return saved;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required.');

  const { data, error } = await supabase
    .from('grades')
    .insert({
      user_id: user.id,
      title: grade.title || 'Assessment',
      weight: grade.weight ?? 0,
      score: grade.score ?? null,
      target_grade: grade.target_grade ?? 40,
      module_code: grade.module_code || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Grade;
}

export async function updateGrade(id: string, patch: Partial<Grade>): Promise<void> {
  if (IS_DEMO) {
    demoGradeState = demoGradeState.map((g) => (g.id === id ? { ...g, ...patch } : g));
    return;
  }
  const { error } = await supabase.from('grades').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteGrade(id: string): Promise<void> {
  if (IS_DEMO) {
    demoGradeState = demoGradeState.filter((g) => g.id !== id);
    return;
  }
  const { error } = await supabase.from('grades').delete().eq('id', id);
  if (error) throw error;
}
