import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { UserProfile } from '../types/db';
import { getMyProfile, updateMyProfile } from '../lib/profileService';
import { setGeminiKey } from '../lib/geminiKey';

interface ProfileContextValue {
  profile: UserProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const p = await getMyProfile();
      setProfile(p);
      setGeminiKey(p?.gemini_api_key ?? null);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (patch: Partial<UserProfile>) => {
    const updated = await updateMyProfile(patch);
    setProfile(updated);
    if ('gemini_api_key' in patch) setGeminiKey(updated.gemini_api_key ?? null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ profile, loading, refresh, updateProfile }),
    [profile, loading, refresh, updateProfile]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within a ProfileProvider');
  return ctx;
}

// Convenience: the best available display name for greetings.
export function usePreferredName(): string {
  const { profile } = useProfile();
  return (
    profile?.preferred_name?.trim() ||
    profile?.full_name?.trim().split(' ')[0] ||
    'Student'
  );
}
