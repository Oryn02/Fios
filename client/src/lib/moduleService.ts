import { supabase } from './supabase';

export interface DBModule {
  id: string;
  user_id: string;
  code: string;
  name: string;
  color: string;
  created_at: string;
}

export const COLOR_OPTIONS: Record<string, { label: string; badge: string; border: string }> = {
  emerald: { label: 'Emerald', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', border: 'border-emerald-400' },
  cyan: { label: 'Cyan', badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', border: 'border-cyan-400' },
  indigo: { label: 'Indigo', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', border: 'border-indigo-400' },
  amber: { label: 'Amber', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', border: 'border-amber-400' },
  rose: { label: 'Rose', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20', border: 'border-rose-400' },
  purple: { label: 'Purple', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20', border: 'border-purple-400' },
};

export async function getUserModules(): Promise<DBModule[]> {
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

export async function deleteModule(moduleId: string): Promise<void> {
  const { error } = await supabase
    .from('modules')
    .delete()
    .eq('id', moduleId);

  if (error) throw error;
}