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
  root.style.setProperty('--fios-accent-via', def.via);
  root.style.setProperty('--fios-accent-to', def.to);
  root.style.setProperty('--fios-accent-solid', def.solid);
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, updateProfile } = useProfile();
  
  // Initialize immediately from localStorage to prevent reload amnesia
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('fios_theme') as ThemeMode) || 'dark';
  });
  
  const [accent, setAccentState] = useState<AccentKey>(() => {
    return (localStorage.getItem('fios_accent') as AccentKey) || 'emerald';
  });

  // Sync from profile when it loads, and keep localStorage updated
  useEffect(() => {
    if (profile?.theme) {
      setThemeState(profile.theme);
      localStorage.setItem('fios_theme', profile.theme);
    }
    if (profile?.accent_color) {
      setAccentState(profile.accent_color);
      localStorage.setItem('fios_accent', profile.accent_color);
    }
  }, [profile]);

  // Apply to document whenever they change
  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => { applyAccent(accent); }, [accent]);

  // Reset to default on unmount (logout)
  useEffect(() => {
    return () => {
      applyTheme('dark');
      applyAccent('emerald');
    };
  }, []);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    localStorage.setItem('fios_theme', t);
    updateProfile({ theme: t }).catch((e: any) => console.error('Failed to persist theme:', e));
  }, [updateProfile]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('fios_theme', next);
      updateProfile({ theme: next }).catch((e: any) => console.error('Failed to persist theme:', e));
      return next;
    });
  }, [updateProfile]);

  const setAccent = useCallback((a: AccentKey) => {
    setAccentState(a);
    localStorage.setItem('fios_accent', a);
    updateProfile({ accent_color: a }).catch((e: any) => console.error('Failed to persist accent:', e));
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