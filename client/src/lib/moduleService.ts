import { supabase } from './supabase';
import { IS_DEMO, demoModules } from './demo';
import {
  MODULE_COLORS,
  buildColorOptions,
  normalizeModuleColor,
  MOD_BADGE_CLASS,
} from './moduleColors';

export interface DBModule {
  id: string;
  user_id: string;
  code: string;
  name: string;
  color: string;
  exam_date?: string | null;
  parent_code?: string | null;
  tags?: string[] | null;
  created_at: string;
}

let demoModuleState: DBModule[] = [...demoModules];

/** Rich module accent picker (CSS `data-mod-color` tokens; light + dark contrast). */
export const COLOR_OPTIONS: Record<string, { label: string; badge: string; border: string }> =
  buildColorOptions();

export { MODULE_COLORS, normalizeModuleColor, MOD_BADGE_CLASS };

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

export async function createModule(
  code: string,
  name: string,
  color: string,
  opts?: { tags?: string[]; parent_code?: string | null }
): Promise<DBModule | null> {
  const normalizedColor = normalizeModuleColor(color);
  if (IS_DEMO) {
    const mod: DBModule = {
      id: `demo-${Date.now()}`,
      user_id: 'demo',
      code: code.trim().toUpperCase(),
      name: name.trim(),
      color: normalizedColor,
      tags: opts?.tags || [],
      parent_code: opts?.parent_code || null,
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
      color: normalizedColor,
      tags: opts?.tags || [],
      parent_code: opts?.parent_code || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateModuleTags(moduleId: string, tags: string[]): Promise<void> {
  if (IS_DEMO) {
    demoModuleState = demoModuleState.map((m) => (m.id === moduleId ? { ...m, tags } : m));
    return;
  }
  const { error } = await supabase.from('modules').update({ tags }).eq('id', moduleId);
  if (error) throw error;
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