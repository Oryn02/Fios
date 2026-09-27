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

/**
 * Admin hard-delete. PostgREST + RLS often return error=null with 0 rows when
 * `feedback_admin_delete` is missing — verify via `.select()` so optimistic UI
 * cannot claim success while the row still exists.
 */
export async function deleteFeedback(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('feedback')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) {
    throw new Error(
      'Delete blocked by RLS — apply feedback_admin_delete (v3.1.2 SQL) and ensure your user is in fios_admins.'
    );
  }
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
  const { data, error } = await supabase
    .from('feedback')
    .delete()
    .in('id', ids)
    .select('id');
  if (error) throw new Error(error.message);
  const deleted = (data || []).map((r) => r.id as string);
  if (deleted.length === 0) {
    throw new Error(
      'Bulk delete blocked by RLS — apply feedback_admin_delete (v3.1.2 SQL) and ensure your user is in fios_admins.'
    );
  }
  return deleted;
}
