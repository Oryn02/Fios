import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ACCENTS, normalizeAccent, type AccentKey, type ThemeMode } from '../types/db';
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

export function applyAccentVars(accent: AccentKey) {
  const def = ACCENTS.find((a) => a.key === accent) || ACCENTS[0];
  const root = document.documentElement;
  // Write as a batch so paint sees a coherent gradient (avoids mid-frame flashes).
  root.style.setProperty('--fios-accent-from', def.from);
  root.style.setProperty('--fios-accent-via', def.via);
  root.style.setProperty('--fios-accent-to', def.to);
  root.style.setProperty('--fios-accent-solid', def.solid);
  root.dataset.accent = accent;
}

function resolveSystem(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function applyResolvedTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  // Keep browser chrome / PWA status bar in sync without a white flash.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'light' ? '#e4dfd4' : '#07090e');
}

function normalizeTheme(raw: string | null | undefined): ThemeMode {
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return 'dark';
}

/**
 * ThemeProvider requires ProfileProvider only for cloud persistence.
 * Accent/theme are applied immediately from localStorage (and the HTML boot script)
 * so auth/landing/dashboard transitions do not flash default emerald/dark.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, updateProfile } = useProfile();

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return normalizeTheme(localStorage.getItem('fios_theme'));
  });

  const [accent, setAccentState] = useState<AccentKey>(() => {
    return normalizeAccent(localStorage.getItem('fios_accent'));
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
      setThemeState((prev) => (prev === t ? prev : t));
      localStorage.setItem('fios_theme', t);
    }
    if (profile?.accent_color) {
      const a = normalizeAccent(profile.accent_color);
      setAccentState((prev) => (prev === a ? prev : a));
      localStorage.setItem('fios_accent', a);
    }
  }, [profile]);

  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemPref : theme;

  useEffect(() => { applyResolvedTheme(resolvedTheme); }, [resolvedTheme]);
  useEffect(() => { applyAccentVars(accent); }, [accent]);

  // Do NOT reset accent/theme on unmount — remounts during auth would flash defaults.

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    localStorage.setItem('fios_theme', t);
    applyResolvedTheme(t === 'system' ? resolveSystem() : t);
    updateProfile({ theme: t }).catch((e: any) => console.error('Failed to persist theme:', e));
  }, [updateProfile]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const current = prev === 'system' ? systemPref : prev;
      const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('fios_theme', next);
      applyResolvedTheme(next);
      updateProfile({ theme: next }).catch((e: any) => console.error('Failed to persist theme:', e));
      return next;
    });
  }, [updateProfile, systemPref]);

  const setAccent = useCallback((a: AccentKey) => {
    const next = normalizeAccent(a);
    setAccentState(next);
    localStorage.setItem('fios_accent', next);
    applyAccentVars(next);
    updateProfile({ accent_color: next }).catch((e: any) => console.error('Failed to persist accent:', e));
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
