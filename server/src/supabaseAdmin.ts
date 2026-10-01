import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/**
 * Service-role Supabase client for privileged writes (metering, streaks, quiz host ops).
 * Returns null when SUPABASE_SERVICE_ROLE_KEY is unset — callers should degrade gracefully.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached) return cached;
  const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/**
 * User-scoped client using the caller's JWT (respects RLS).
 */
export function getSupabaseAsUser(accessToken: string): SupabaseClient | null {
  const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const anon = String(process.env.SUPABASE_ANON_KEY || '').trim();
  if (!url || !anon || !accessToken) return null;
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
