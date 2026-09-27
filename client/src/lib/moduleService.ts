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

/** Escape a string for safe use inside a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a stable internal module key when the user leaves course code blank.
 * Kept for FK joining (`module_code` on decks/quizzes/etc.) — never shown as the
 * primary user-facing identity when a name exists.
 */
export function synthesizeModuleCode(name: string): string {
  const slug =
    name
      .replace(/[^a-zA-Z0-9]+/g, '')
      .slice(0, 8)
      .toUpperCase() || 'MODULE';
  return `${slug}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
}

/** True when `code` looks like an auto-generated internal key (not a user course code). */
export function isInternalModuleCode(code: string, name?: string): boolean {
  const c = (code || '').trim();
  if (!c) return true;
  if (/^MOD-[A-Z0-9]+$/i.test(c)) return true;
  if (name) {
    const slug =
      name.replace(/[^a-zA-Z0-9]+/g, '').slice(0, 8).toUpperCase() || 'MODULE';
    if (new RegExp(`^${escapeRegExp(slug)}-[A-Z0-9]{4}$`, 'i').test(c)) return true;
  }
  return false;
}

/** User-facing module title — prefer name; never fall back to code when name exists. */
export function moduleDisplayName(
  mod: Pick<DBModule, 'name' | 'code'> | null | undefined,
  fallback = 'General'
): string {
  if (!mod) return fallback;
  const name = (mod.name || '').trim();
  if (name) return name;
  const code = (mod.code || '').trim();
  return code || fallback;
}

/** User-entered course code only (hides synthetic internal keys). */
export function moduleCourseCode(
  mod: Pick<DBModule, 'name' | 'code'> | null | undefined
): string | null {
  if (!mod?.code?.trim()) return null;
  if (isInternalModuleCode(mod.code, mod.name)) return null;
  return mod.code.trim();
}

/** Resolve a stored `module_code` FK to a display label via the modules list. */
export function resolveModuleLabel(
  modules: Array<Pick<DBModule, 'name' | 'code'>>,
  moduleCode: string | null | undefined,
  fallback = 'General'
): string {
  if (!moduleCode) return fallback;
  const hit = modules.find((m) => m.code === moduleCode);
  return moduleDisplayName(hit ?? { name: '', code: moduleCode }, moduleCode);
}

const MODULE_CODE_TABLES = [
  'decks',
  'mcq_quizzes',
  'code_exams',
  'tasks',
  'documents',
  'grades',
  'active_recall_logs',
] as const;

async function cascadeModuleCode(oldCode: string, newCode: string): Promise<void> {
  if (!oldCode || oldCode === newCode) return;
  for (const table of MODULE_CODE_TABLES) {
    const { error } = await supabase
      .from(table)
      .update({ module_code: newCode })
      .eq('module_code', oldCode);
    if (error) {
      console.error(`Failed cascading module_code on ${table}:`, error);
      throw error;
    }
  }
}

export async function createModule(
  code: string,
  name: string,
  color: string,
  opts?: { tags?: string[]; parent_code?: string | null }
): Promise<DBModule | null> {
  const normalizedColor = normalizeModuleColor(color);
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('Module name is required.');
  // Course code fully optional — synthesize an internal key when blank (not shown as primary label).
  const userCode = code.trim().toUpperCase();
  const trimmedCode = userCode || synthesizeModuleCode(trimmedName);

  if (IS_DEMO) {
    const mod: DBModule = {
      id: `demo-${Date.now()}`,
      user_id: 'demo',
      code: trimmedCode,
      name: trimmedName,
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
      code: trimmedCode,
      name: trimmedName,
      color: normalizedColor,
      tags: opts?.tags || [],
      parent_code: opts?.parent_code || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export type UpdateModuleFields = {
  code?: string;
  name?: string;
  color?: string;
  tags?: string[];
  parent_code?: string | null;
};

/** Update an existing module; cascades `module_code` FKs when the internal key changes. */
export async function updateModule(
  moduleId: string,
  fields: UpdateModuleFields
): Promise<DBModule | null> {
  const existing = IS_DEMO
    ? demoModuleState.find((m) => m.id === moduleId)
    : (
        await supabase.from('modules').select('*').eq('id', moduleId).maybeSingle()
      ).data;

  if (!existing) throw new Error('Module not found.');

  const nextName = fields.name !== undefined ? fields.name.trim() : existing.name;
  if (!nextName) throw new Error('Module name is required.');

  let nextCode = existing.code;
  if (fields.code !== undefined) {
    const userCode = fields.code.trim().toUpperCase();
    // Clearing course code → keep a stable synthetic key (re-synthesize only if prior was user code).
    nextCode = userCode || (
      isInternalModuleCode(existing.code, existing.name)
        ? existing.code
        : synthesizeModuleCode(nextName)
    );
  }

  const patch: Partial<DBModule> = {
    name: nextName,
    code: nextCode,
  };
  if (fields.color !== undefined) patch.color = normalizeModuleColor(fields.color);
  if (fields.tags !== undefined) patch.tags = fields.tags;
  if (fields.parent_code !== undefined) patch.parent_code = fields.parent_code;

  if (IS_DEMO) {
    if (existing.code !== nextCode) {
      // Demo content keyed by module_code lives in other demo arrays — callers refresh via loadData.
    }
    demoModuleState = demoModuleState.map((m) =>
      m.id === moduleId ? { ...m, ...patch } : m
    );
    return demoModuleState.find((m) => m.id === moduleId) || null;
  }

  const { data, error } = await supabase
    .from('modules')
    .update(patch)
    .eq('id', moduleId)
    .select()
    .single();

  if (error) throw error;

  if (existing.code !== nextCode) {
    await cascadeModuleCode(existing.code, nextCode);
  }

  return data;
}

export async function updateModuleTags(moduleId: string, tags: string[]): Promise<void> {
  await updateModule(moduleId, { tags });
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