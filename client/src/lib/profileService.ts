import { supabase } from './supabase';
import type { UserProfile } from '../types/db';
import { DEFAULT_POMODORO } from '../types/db';
import { IS_DEMO, demoProfile, DEMO_USER } from './demo';

let demoProfileState: UserProfile = { ...demoProfile };

export function makeDefaultProfile(id: string, email?: string): UserProfile {
  return {
    id,
    full_name: '',
    preferred_name: email ? email.split('@')[0] : '',
    address: '',
    avatar_url: null,
    accent_color: 'emerald',
    theme: 'dark',
    gemini_api_key: null,
    weekly_study_goal_hours: 10,
    pomodoro_work_duration: DEFAULT_POMODORO.work,
    pomodoro_short_break: DEFAULT_POMODORO.shortBreak,
    pomodoro_long_break: DEFAULT_POMODORO.longBreak,
  };
}

export async function getMyProfile(): Promise<UserProfile | null> {
  if (IS_DEMO) return { ...demoProfileState };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Error loading profile:', error);
    return makeDefaultProfile(user.id, user.email || undefined);
  }

  // Auto-provision a row the first time if the trigger has not populated it.
  if (!data) {
    const fresh = makeDefaultProfile(user.id, user.email || undefined);
    const { data: inserted, error: insertError } = await supabase
      .from('user_profiles')
      .insert(fresh)
      .select()
      .maybeSingle();
    if (insertError) {
      console.error('Error creating profile:', insertError);
      return fresh;
    }
    return (inserted as UserProfile) || fresh;
  }

  return data as UserProfile;
}

export async function updateMyProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
  if (IS_DEMO) {
    demoProfileState = { ...demoProfileState, ...patch };
    return { ...demoProfileState };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required.');

  const { data, error } = await supabase
    .from('user_profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data as UserProfile;
}

export { DEMO_USER };
