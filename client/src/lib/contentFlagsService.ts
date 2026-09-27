/**
 * Content flags — user-reported moderation queue (Supabase `content_flags`).
 */
import { supabase } from './supabase';

export const FLAG_TARGET_TYPES = [
  'deck',
  'document',
  'task',
  'tutor_message',
  'other',
] as const;

export type FlagTargetType = (typeof FLAG_TARGET_TYPES)[number];

export const FLAG_REASONS = [
  'spam',
  'abuse',
  'inappropriate',
  'copyright',
  'other',
] as const;

export type FlagReason = (typeof FLAG_REASONS)[number];

export type FlagStatus = 'open' | 'resolved' | 'dismissed';

export interface ContentFlag {
  id: string;
  reporter_id: string | null;
  target_type: FlagTargetType;
  target_id: string | null;
  target_label: string;
  reason: string;
  details: string;
  status: FlagStatus;
  admin_note: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface SubmitFlagInput {
  targetType: FlagTargetType;
  targetId?: string | null;
  targetLabel?: string;
  reason?: FlagReason | string;
  details?: string;
}

export async function submitContentFlag(input: SubmitFlagInput): Promise<ContentFlag> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in to report content.');

  const row = {
    reporter_id: user.id,
    target_type: input.targetType,
    target_id: input.targetId || null,
    target_label: (input.targetLabel || '').trim().slice(0, 200),
    reason: (input.reason || 'other').toString().slice(0, 64),
    details: (input.details || '').trim().slice(0, 4000),
    status: 'open' as const,
  };

  const { data, error } = await supabase.from('content_flags').insert(row).select().single();
  if (error) throw new Error(error.message);
  return data as ContentFlag;
}

/** Admin-only: list flags (RLS requires fios_admins). */
export async function listContentFlags(limit = 200): Promise<ContentFlag[]> {
  const { data, error } = await supabase
    .from('content_flags')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []) as ContentFlag[];
}

export async function setContentFlagStatus(
  id: string,
  status: FlagStatus,
  adminNote?: string
): Promise<ContentFlag> {
  const { data: { user } } = await supabase.auth.getUser();
  const resolved = status === 'resolved' || status === 'dismissed';
  const patch: Record<string, unknown> = {
    status,
    resolved_at: resolved ? new Date().toISOString() : null,
    resolved_by: resolved ? (user?.id ?? null) : null,
  };
  if (typeof adminNote === 'string') patch.admin_note = adminNote.slice(0, 2000);

  const { data, error } = await supabase
    .from('content_flags')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ContentFlag;
}

export async function createAdminFlag(input: {
  targetType: FlagTargetType;
  targetId?: string | null;
  targetLabel?: string;
  reason?: string;
  details?: string;
}): Promise<ContentFlag> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in required.');

  const row = {
    reporter_id: user.id,
    target_type: input.targetType,
    target_id: input.targetId || null,
    target_label: (input.targetLabel || '').trim().slice(0, 200) || 'Admin-created flag',
    reason: (input.reason || 'other').toString().slice(0, 64),
    details: (input.details || '').trim().slice(0, 4000),
    status: 'open' as const,
  };

  const { data, error } = await supabase.from('content_flags').insert(row).select().single();
  if (error) throw new Error(error.message);
  return data as ContentFlag;
}

export async function deleteContentFlag(id: string): Promise<void> {
  const { error } = await supabase.from('content_flags').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export type FlagStatusFilter = 'all' | 'open' | 'resolved' | 'dismissed';

export function filterContentFlags(
  rows: ContentFlag[],
  opts: { status?: FlagStatusFilter; query?: string }
): ContentFlag[] {
  const status = opts.status || 'all';
  const q = (opts.query || '').trim().toLowerCase();
  return rows.filter((f) => {
    if (status !== 'all' && f.status !== status) return false;
    if (q) {
      const hay = `${f.target_label} ${f.target_type} ${f.reason} ${f.details} ${f.admin_note} ${f.reporter_id || ''} ${f.target_id || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
