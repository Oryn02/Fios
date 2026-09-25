import { supabase } from './supabase';
import { IS_DEMO, demoModules } from './demo';

export interface DBModule {
  id: string;
  user_id: string;
  code: string;
  name: string;
  color: string;
  exam_date?: string | null;
  created_at: string;
}

let demoModuleState: DBModule[] = [...demoModules];

export const COLOR_OPTIONS: Record<string, { label: string; badge: string; border: string }> = {
  emerald: { label: 'Emerald', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', border: 'border-emerald-400' },
  cyan: { label: 'Cyan', badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', border: 'border-cyan-400' },
  indigo: { label: 'Indigo', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', border: 'border-indigo-400' },
  amber: { label: 'Amber', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', border: 'border-amber-400' },
  rose: { label: 'Rose', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20', border: 'border-rose-400' },
  purple: { label: 'Purple', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20', border: 'border-purple-400' },
};

export async function getUserModules(): Promise<DBModule[]> {
  if (IS_DEMO) return [...demoModuleState];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching modules:', error);
    return [];
  }

  return data || [];
}

export async function createModule(code: string, name: string, color: string): Promise<DBModule | null> {
  if (IS_DEMO) {
    const mod: DBModule = {
      id: `demo-${Date.now()}`,
      user_id: 'demo',
      code: code.trim().toUpperCase(),
      name: name.trim(),
      color,
      created_at: new Date().toISOString(),
    };
    demoModuleState = [...demoModuleState, mod];
    return mod;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required.');

  const { data, error } = await supabase
    .from('modules')
    .insert({
      user_id: user.id,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      color,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function setModuleExamDate(moduleId: string, examDate: string | null): Promise<void> {
  if (IS_DEMO) {
    demoModuleState = demoModuleState.map((m) => (m.id === moduleId ? { ...m, exam_date: examDate } : m));
    return;
  }
  const { error } = await supabase.from('modules').update({ exam_date: examDate }).eq('id', moduleId);
  if (error) throw error;
}

export async function deleteModule(moduleId: string): Promise<void> {
  if (IS_DEMO) {
    demoModuleState = demoModuleState.filter((m) => m.id !== moduleId);
    return;
  }

  const { error } = await supabase
    .from('modules')
    .delete()
    .eq('id', moduleId);

  if (error) throw error;
}