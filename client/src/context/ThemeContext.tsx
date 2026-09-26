import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ACCENTS, type AccentKey, type ThemeMode } from '../types/db';
import { useProfile } from './ProfileContext';

type ResolvedTheme = 'dark' | 'light';

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
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

function resolveSystem(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyResolved(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
}

function normalizeTheme(raw: string | null | undefined): ThemeMode {
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return 'dark';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, updateProfile } = useProfile();

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return normalizeTheme(localStorage.getItem('fios_theme'));
  });

  const [accent, setAccentState] = useState<AccentKey>(() => {
    return (localStorage.getItem('fios_accent') as AccentKey) || 'emerald';
  });

  const [systemPref, setSystemPref] = useState<ResolvedTheme>(() => resolveSystem());

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => setSystemPref(mq.matches ? 'light' : 'dark');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (profile?.theme) {
      const t = normalizeTheme(profile.theme);
      setThemeState(t);
      localStorage.setItem('fios_theme', t);
    }
    if (profile?.accent_color) {
      setAccentState(profile.accent_color);
      localStorage.setItem('fios_accent', profile.accent_color);
    }
  }, [profile]);

  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemPref : theme;

  useEffect(() => { applyResolved(resolvedTheme); }, [resolvedTheme]);
  useEffect(() => { applyAccent(accent); }, [accent]);

  useEffect(() => {
    return () => {
      applyResolved('dark');
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
      const current = prev === 'system' ? systemPref : prev;
      const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('fios_theme', next);
      updateProfile({ theme: next }).catch((e: any) => console.error('Failed to persist theme:', e));
      return next;
    });
  }, [updateProfile, systemPref]);

  const setAccent = useCallback((a: AccentKey) => {
    setAccentState(a);
    localStorage.setItem('fios_accent', a);
    updateProfile({ accent_color: a }).catch((e: any) => console.error('Failed to persist accent:', e));
  }, [updateProfile]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, accent, setTheme, toggleTheme, setAccent }),
    [theme, resolvedTheme, accent, setTheme, toggleTheme, setAccent]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
