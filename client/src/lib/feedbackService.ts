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
}

export interface SubmitFeedbackInput {
  rating: number;
  categories: FeedbackCategory[];
  message: string;
  anonymous?: boolean;
}

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

export async function deleteFeedback(id: string): Promise<void> {
  const { error } = await supabase.from('feedback').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
