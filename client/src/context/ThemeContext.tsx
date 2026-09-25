import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ACCENTS, type AccentKey, type ThemeMode } from '../types/db';
import { useProfile } from './ProfileContext';

interface ThemeContextValue {
  theme: ThemeMode;
  accent: AccentKey;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  setAccent: (a: AccentKey) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyAccent(accent: AccentKey) {
  const def = ACCENTS.find((a) => a.key === accent) || ACCENTS[0];
  const root = document.documentElement;
  root.style.setProperty('--fios-accent-from', def.from);
  root.style.setProperty('--fios-accent-to', def.to);
  root.style.setProperty('--fios-accent-solid', def.solid);
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute('data-theme', theme);
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, updateProfile } = useProfile();
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [accent, setAccentState] = useState<AccentKey>('emerald');

  // Sync from the loaded profile.
  useEffect(() => {
    if (profile) {
      setThemeState(profile.theme || 'dark');
      setAccentState(profile.accent_color || 'emerald');
    }
  }, [profile]);

  // Apply to the document whenever they change.
  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => { applyAccent(accent); }, [accent]);

  // Reset to the landing page's fixed identity on unmount (logout).
  useEffect(() => {
    return () => {
      applyTheme('dark');
      applyAccent('emerald');
    };
  }, []);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    updateProfile({ theme: t }).catch((e) => console.error('Failed to persist theme:', e));
  }, [updateProfile]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      updateProfile({ theme: next }).catch((e) => console.error('Failed to persist theme:', e));
      return next;
    });
  }, [updateProfile]);

  const setAccent = useCallback((a: AccentKey) => {
    setAccentState(a);
    updateProfile({ accent_color: a }).catch((e) => console.error('Failed to persist accent:', e));
  }, [updateProfile]);

  const value = useMemo(
    () => ({ theme, accent, setTheme, toggleTheme, setAccent }),
    [theme, accent, setTheme, toggleTheme, setAccent]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
