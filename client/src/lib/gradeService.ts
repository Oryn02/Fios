import { supabase } from './supabase';
import type { Grade } from '../types/db';
import { IS_DEMO, demoGrades } from './demo';

/**
 * Live Supabase (v3.0.0) shipped a legacy `grades` shape:
 *   assessment_name, weight_percentage, score_achieved  (no target_grade)
 * Repo schema.sql uses canonical names:
 *   title, weight, score, target_grade
 *
 * The client always speaks Grade (canonical). This service maps both ways and
 * keeps module targets in localStorage when `target_grade` is absent.
 */

let demoGradeState: Grade[] = [...demoGrades];

type GradesColumnSet = 'canonical' | 'legacy';

let cachedColumnSet: GradesColumnSet | null = null;
let cachedHasTargetGrade: boolean | null = null;

const TARGETS_LS_KEY = 'fios_grade_targets';

type GradeRow = {
  id: string;
  user_id: string;
  module_code?: string | null;
  created_at: string;
  // canonical
  title?: string | null;
  weight?: number | null;
  score?: number | null;
  target_grade?: number | null;
  // legacy (live v3.0.0)
  assessment_name?: string | null;
  weight_percentage?: number | null;
  score_achieved?: number | null;
};

function readLocalTargets(): Record<string, number> {
  try {
    const raw = localStorage.getItem(TARGETS_LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed || {})) {
      const n = Number(v);
      if (Number.isFinite(n)) out[k] = n;
    }
    return out;
  } catch {
    return {};
  }
}

function writeLocalTarget(moduleKey: string, target: number): void {
  try {
    const all = readLocalTargets();
    all[moduleKey || 'General'] = target;
    localStorage.setItem(TARGETS_LS_KEY, JSON.stringify(all));
  } catch {
    /* ignore quota / private mode */
  }
}

function localTargetFor(moduleCode: string | null | undefined): number | undefined {
  const all = readLocalTargets();
  const key = moduleCode || 'General';
  return all[key];
}

async function columnExists(column: string): Promise<boolean> {
  const { error } = await supabase.from('grades').select(column).limit(0);
  if (!error) return true;
  // Missing column → 42703 / PGRST204; other errors (RLS, network) — treat as unknown
  const code = (error as { code?: string }).code;
  if (code === '42703' || code === 'PGRST204') return false;
  // Ambiguous: don't cache a false negative for transient auth errors
  return false;
}

async function detectColumnSet(): Promise<GradesColumnSet> {
  if (cachedColumnSet) return cachedColumnSet;
  if (await columnExists('title')) {
    cachedColumnSet = 'canonical';
    return cachedColumnSet;
  }
  if (await columnExists('assessment_name')) {
    cachedColumnSet = 'legacy';
    return cachedColumnSet;
  }
  // Default to canonical (matches schema.sql) for greenfield
  cachedColumnSet = 'canonical';
  return cachedColumnSet;
}

async function hasTargetGradeColumn(): Promise<boolean> {
  if (cachedHasTargetGrade != null) return cachedHasTargetGrade;
  cachedHasTargetGrade = await columnExists('target_grade');
  return cachedHasTargetGrade;
}

/** Reset cached schema detection (tests / after migrations). */
export function resetGradesSchemaCache(): void {
  cachedColumnSet = null;
  cachedHasTargetGrade = null;
}

function rowToGrade(row: GradeRow): Grade {
  const moduleCode = row.module_code ?? null;
  const fromDb =
    row.target_grade !== undefined && row.target_grade !== null
      ? Number(row.target_grade)
      : undefined;
  const target =
    fromDb !== undefined && Number.isFinite(fromDb)
      ? fromDb
      : localTargetFor(moduleCode) ?? 40;

  const title = (row.title ?? row.assessment_name ?? 'Assessment') || 'Assessment';
  const weight = Number(row.weight ?? row.weight_percentage ?? 0) || 0;
  const rawScore = row.score !== undefined ? row.score : row.score_achieved;
  const score =
    rawScore === null || rawScore === undefined || rawScore === ('' as unknown)
      ? null
      : Number(rawScore);

  return {
    id: row.id,
    user_id: row.user_id,
    module_code: moduleCode,
    title,
    weight,
    score: score !== null && Number.isFinite(score) ? score : null,
    target_grade: target,
    created_at: row.created_at,
  };
}

function toInsertPayload(
  userId: string,
  grade: Partial<Grade>,
  columnSet: GradesColumnSet,
  includeTarget: boolean
): Record<string, unknown> {
  const title = grade.title || 'Assessment';
  const weight = grade.weight ?? 0;
  const score = grade.score ?? null;
  const moduleCode = grade.module_code || null;
  const target = grade.target_grade ?? 40;

  const base: Record<string, unknown> = {
    user_id: userId,
    module_code: moduleCode,
  };

  if (columnSet === 'legacy') {
    base.assessment_name = title;
    base.weight_percentage = weight;
    base.score_achieved = score;
  } else {
    base.title = title;
    base.weight = weight;
    base.score = score;
  }

  if (includeTarget) {
    base.target_grade = target;
  }

  return base;
}

function toUpdatePayload(
  patch: Partial<Grade>,
  columnSet: GradesColumnSet,
  includeTarget: boolean
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  if (patch.module_code !== undefined) out.module_code = patch.module_code || null;

  if (columnSet === 'legacy') {
    if (patch.title !== undefined) out.assessment_name = patch.title;
    if (patch.weight !== undefined) out.weight_percentage = patch.weight;
    if (patch.score !== undefined) out.score_achieved = patch.score;
  } else {
    if (patch.title !== undefined) out.title = patch.title;
    if (patch.weight !== undefined) out.weight = patch.weight;
    if (patch.score !== undefined) out.score = patch.score;
  }

  if (includeTarget && patch.target_grade !== undefined) {
    out.target_grade = patch.target_grade;
  }

  return out;
}

function isMissingColumnError(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  return e?.code === 'PGRST204' || e?.code === '42703' || /Could not find the '.*' column/i.test(e?.message || '');
}

function asError(err: unknown, fallback: string): Error {
  if (err instanceof Error) return err;
  const msg =
    err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
      ? (err as { message: string }).message
      : fallback;
  return new Error(msg || fallback);
}

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

  // Warm schema cache from a successful select
  void detectColumnSet();
  void hasTargetGradeColumn();

  return ((data as GradeRow[]) || []).map(rowToGrade);
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
    writeLocalTarget(saved.module_code || 'General', saved.target_grade);
    return saved;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required.');

  const columnSet = await detectColumnSet();
  let includeTarget = await hasTargetGradeColumn();

  // Always mirror target locally so predictions work without the DB column
  writeLocalTarget(grade.module_code || 'General', grade.target_grade ?? 40);

  const attempt = async (withTarget: boolean) => {
    const payload = toInsertPayload(user.id, grade, columnSet, withTarget);
    return supabase.from('grades').insert(payload).select().single();
  };

  let { data, error } = await attempt(includeTarget);

  if (error && includeTarget && isMissingColumnError(error)) {
    cachedHasTargetGrade = false;
    includeTarget = false;
    ({ data, error } = await attempt(false));
  }

  // If we guessed the wrong column set, flip and retry once
  if (error && isMissingColumnError(error)) {
    const other: GradesColumnSet = columnSet === 'legacy' ? 'canonical' : 'legacy';
    cachedColumnSet = other;
    ({ data, error } = await attempt(false));
  }

  if (error) throw asError(error, 'Could not save assessment');
  return rowToGrade(data as GradeRow);
}

export async function updateGrade(id: string, patch: Partial<Grade>): Promise<void> {
  if (IS_DEMO) {
    demoGradeState = demoGradeState.map((g) => {
      if (g.id !== id) {
        // Keep module-wide target in sync in demo, matching UI behaviour
        if (patch.target_grade !== undefined) {
          const src = demoGradeState.find((x) => x.id === id);
          if (src && g.module_code === src.module_code) {
            return { ...g, target_grade: patch.target_grade! };
          }
        }
        return g;
      }
      return { ...g, ...patch };
    });
    if (patch.target_grade !== undefined) {
      const src = demoGradeState.find((x) => x.id === id);
      writeLocalTarget(src?.module_code || 'General', patch.target_grade);
    }
    return;
  }

  if (patch.target_grade !== undefined) {
    // Resolve module key from current row when possible
    const existing = (await supabase.from('grades').select('*').eq('id', id).maybeSingle()).data as GradeRow | null;
    const moduleKey = patch.module_code ?? existing?.module_code ?? 'General';
    writeLocalTarget(moduleKey || 'General', patch.target_grade);
  }

  const columnSet = await detectColumnSet();
  let includeTarget = await hasTargetGradeColumn();
  let payload = toUpdatePayload(patch, columnSet, includeTarget);

  // Nothing to persist remotely (e.g. target-only update on legacy schema)
  if (Object.keys(payload).length === 0) return;

  let { error } = await supabase.from('grades').update(payload).eq('id', id);

  if (error && includeTarget && isMissingColumnError(error)) {
    cachedHasTargetGrade = false;
    includeTarget = false;
    payload = toUpdatePayload(patch, columnSet, false);
    if (Object.keys(payload).length === 0) return;
    ({ error } = await supabase.from('grades').update(payload).eq('id', id));
  }

  if (error && isMissingColumnError(error)) {
    const other: GradesColumnSet = columnSet === 'legacy' ? 'canonical' : 'legacy';
    cachedColumnSet = other;
    payload = toUpdatePayload(patch, other, false);
    if (Object.keys(payload).length === 0) return;
    ({ error } = await supabase.from('grades').update(payload).eq('id', id));
  }

  if (error) throw asError(error, 'Could not update assessment');
}

export async function deleteGrade(id: string): Promise<void> {
  if (IS_DEMO) {
    demoGradeState = demoGradeState.filter((g) => g.id !== id);
    return;
  }
  const { error } = await supabase.from('grades').delete().eq('id', id);
  if (error) throw asError(error, 'Could not delete assessment');
}
