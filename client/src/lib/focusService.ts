import { supabase } from './supabase';
import type { FocusSession } from '../types/db';
import { IS_DEMO, demoFocusSessions } from './demo';
import type { User } from '@supabase/supabase-js';

let demoFocusState: FocusSession[] = [...demoFocusSessions];

/**
 * Prefer the local session (works offline / PWA cold start).
 * Fall back to getUser() only when storage has no session yet.
 * getUser() hits the network and can return null on flaky mobile before
 * the heatmap mounts — which previously wiped contribution data.
 */
async function resolveAuthUser(): Promise<User | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) return sessionData.session.user;
  try {
    const { data: userData } = await supabase.auth.getUser();
    return userData.user ?? null;
  } catch {
    return null;
  }
}

export async function logFocusSession(minutes: number, mode: string = 'work'): Promise<void> {
  if (IS_DEMO) {
    demoFocusState = [
      { id: `demo-${Date.now()}`, user_id: 'demo', minutes, mode, created_at: new Date().toISOString() },
      ...demoFocusState,
    ];
    return;
  }

  const user = await resolveAuthUser();
  if (!user) return;

  const { error } = await supabase
    .from('focus_sessions')
    .insert({ user_id: user.id, minutes, mode });
  if (error) console.error('Failed to log focus session:', error);
}

export async function getFocusSessions(sinceIso?: string): Promise<FocusSession[]> {
  if (IS_DEMO) {
    return sinceIso ? demoFocusState.filter((f) => f.created_at >= sinceIso) : [...demoFocusState];
  }

  const user = await resolveAuthUser();
  if (!user) return [];

  let query = supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (sinceIso) query = query.gte('created_at', sinceIso);

  const { data, error } = await query;
  if (error) {
    console.error('Error loading focus sessions:', error);
    return [];
  }
  return (data as FocusSession[]) || [];
}

// Total focus minutes logged since the start of the current week (Mon 00:00).
export async function getWeeklyFocusMinutes(): Promise<number> {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sessions = await getFocusSessions(monday.toISOString());
  return sessions.filter((s) => s.mode === 'work').reduce((sum, s) => sum + (s.minutes || 0), 0);
}
