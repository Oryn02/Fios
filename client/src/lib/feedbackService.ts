import { supabase } from './supabase';

export const FEEDBACK_CATEGORIES = [
  'bug',
  'feature',
  'ux',
  'performance',
  'privacy',
  'other',
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export interface FeedbackEntry {
  id: string;
  user_id: string | null;
  rating: number;
  categories: string[];
  message: string;
  anonymous: boolean;
  created_at: string;
  /** Set when an admin marks the item resolved (requires schema migration). */
  resolved_at?: string | null;
  resolved_by?: string | null;
}

export interface SubmitFeedbackInput {
  rating: number;
  categories: FeedbackCategory[];
  message: string;
  anonymous?: boolean;
}

export type FeedbackResolveFilter = 'all' | 'open' | 'resolved';

const DELETE_RLS_HINT =
  'Delete blocked — run supabase/v3.1.9-feedback-admin-delete.sql, reload PostgREST schema, and ensure your user is in fios_admins.';

export async function submitFeedback(input: SubmitFeedbackInput): Promise<FeedbackEntry> {
  const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  const anonymous = !!input.anonymous;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !anonymous) {
    throw new Error('Sign in to send feedback, or submit anonymously.');
  }

  const row = {
    user_id: anonymous ? null : user?.id ?? null,
    rating,
    categories: input.categories,
    message: (input.message || '').trim().slice(0, 4000),
    anonymous,
  };

  const { data, error } = await supabase.from('feedback').insert(row).select().single();
  if (error) throw new Error(error.message);
  return data as FeedbackEntry;
}

/** Admin-only: list all feedback (RLS requires fios_admins membership). */
export async function listAllFeedback(): Promise<FeedbackEntry[]> {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data || []) as FeedbackEntry[];
}

export function filterFeedback(
  rows: FeedbackEntry[],
  opts: {
    resolve?: FeedbackResolveFilter;
    minRating?: number;
    category?: string;
    query?: string;
  }
): FeedbackEntry[] {
  const resolve = opts.resolve || 'all';
  const q = (opts.query || '').trim().toLowerCase();
  const cat = (opts.category || '').trim().toLowerCase();
  return rows.filter((f) => {
    if (resolve === 'open' && f.resolved_at) return false;
    if (resolve === 'resolved' && !f.resolved_at) return false;
    if (opts.minRating && f.rating < opts.minRating) return false;
    if (cat && !(f.categories || []).some((c) => c.toLowerCase() === cat)) return false;
    if (q) {
      const hay = `${f.message || ''} ${(f.categories || []).join(' ')} ${f.user_id || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** Confirm the row is gone (RLS select); used after delete / RPC. */
async function assertFeedbackGone(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('feedback')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return !data;
}

/**
 * Admin hard-delete.
 * Prefer SECURITY DEFINER RPC (v3.1.9); fall back to DELETE + RETURNING +
 * existence check so optimistic UI cannot claim success while the row remains.
 */
export async function deleteFeedback(id: string): Promise<void> {
  const { data: rpcId, error: rpcError } = await supabase.rpc('admin_delete_feedback', {
    p_id: id,
  });

  if (!rpcError) {
    if (rpcId === id || rpcId == null) {
      // rpcId null → already gone; otherwise must match.
      if (rpcId === id || (await assertFeedbackGone(id))) return;
    }
    if (await assertFeedbackGone(id)) return;
    throw new Error(DELETE_RLS_HINT);
  }

  // RPC missing (PGRST202 / 42883) → direct delete path until SQL is applied.
  const rpcMissing =
    /could not find the function|function .* does not exist|PGRST202/i.test(
      rpcError.message || ''
    );

  if (!rpcMissing) {
    throw new Error(rpcError.message || DELETE_RLS_HINT);
  }

  const { data, error } = await supabase
    .from('feedback')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);

  if (data?.length) {
    if (await assertFeedbackGone(id)) return;
    throw new Error(DELETE_RLS_HINT);
  }

  // Empty RETURNING: either RLS blocked or Prefer/representation quirk — verify.
  if (await assertFeedbackGone(id)) return;
  throw new Error(DELETE_RLS_HINT);
}

/** Admin-only: mark feedback resolved / reopen (needs feedback_admin_update + resolved_at column). */
export async function setFeedbackResolved(id: string, resolved: boolean): Promise<FeedbackEntry> {
  const { data: { user } } = await supabase.auth.getUser();
  const patch = resolved
    ? { resolved_at: new Date().toISOString(), resolved_by: user?.id ?? null }
    : { resolved_at: null, resolved_by: null };

  const { data, error } = await supabase
    .from('feedback')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FeedbackEntry;
}

/** Admin-only: hard-delete many rows; returns IDs actually removed. */
export async function deleteAllFeedback(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];

  const { data: rpcIds, error: rpcError } = await supabase.rpc('admin_delete_feedback_ids', {
    p_ids: ids,
  });

  if (!rpcError) {
    const deleted = Array.isArray(rpcIds)
      ? (rpcIds as string[]).filter(Boolean)
      : [];
    if (deleted.length > 0) return deleted;
    // All already gone
    const still: string[] = [];
    for (const id of ids) {
      if (!(await assertFeedbackGone(id))) still.push(id);
    }
    if (still.length === 0) return ids;
    throw new Error(DELETE_RLS_HINT);
  }

  const rpcMissing =
    /could not find the function|function .* does not exist|PGRST202/i.test(
      rpcError.message || ''
    );
  if (!rpcMissing) {
    throw new Error(rpcError.message || DELETE_RLS_HINT);
  }

  const { data, error } = await supabase
    .from('feedback')
    .delete()
    .in('id', ids)
    .select('id');
  if (error) throw new Error(error.message);
  const deleted = (data || []).map((r) => r.id as string);

  const confirmed: string[] = [];
  for (const id of ids) {
    if (deleted.includes(id) || (await assertFeedbackGone(id))) confirmed.push(id);
  }
  if (confirmed.length === 0) {
    throw new Error(DELETE_RLS_HINT);
  }
  return confirmed;
}
