import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ACCENTS, normalizeAccent, type AccentKey, type ThemeMode } from '../types/db';
import { useProfile } from './ProfileContext';
import {
  applyHolidayPaletteVars,
  birthdayPalette,
  clearStaleHolidayManualFlags,
  getAdminHolidayPreview,
  hasHolidayManualOverride,
  holidayPalette,
  markHolidayManualOverride,
  setAdminHolidayPreview,
  type HolidayPalette,
} from '../lib/holidays';

type ResolvedTheme = 'dark' | 'light';

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  accent: AccentKey;
  /** Active holiday palette (calendar day-auto, or admin session preview). */
  holidayTheme: HolidayPalette | null;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  setAccent: (a: AccentKey) => void;
  /** Admin-only: apply a holiday palette immediately (session-scoped). */
  previewHolidayTheme: (palette: HolidayPalette | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function applyAccentVars(accent: AccentKey) {
  const def = ACCENTS.find((a) => a.key === accent) || ACCENTS[0];
  const root = document.documentElement;
  if (root.getAttribute('data-landing-active') === 'true') return;
  root.style.setProperty('--fios-accent-from', def.from);
  root.style.setProperty('--fios-accent-via', def.via);
  root.style.setProperty('--fios-accent-to', def.to);
  root.style.setProperty('--fios-accent-solid', def.solid);
  root.dataset.accent = accent;
  root.removeAttribute('data-holiday');
  root.removeAttribute('data-holiday-mood');
}

function resolveSystem(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function applyResolvedTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  if (root.getAttribute('data-landing-active') === 'true') return;
  root.setAttribute('data-theme', resolved);
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'light' ? '#f8fafc' : '#07090e');
}

function normalizeTheme(raw: string | null | undefined): ThemeMode {
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return 'dark';
}

/**
 * Resolve active holiday palette:
 * 1. Admin session preview (if set) wins
 * 2. Else skip when user manually changed theme today
 * 3. Else birthday (profile month/day match)
 * 4. Else calendar day-auto holiday
 */
function computeHolidayActive(birthday?: string | null): HolidayPalette | null {
  clearStaleHolidayManualFlags();
  const adminPreview = getAdminHolidayPreview();
  if (adminPreview) return adminPreview;
  if (hasHolidayManualOverride()) return null;
  return birthdayPalette(birthday) || holidayPalette();
}

/**
 * ThemeProvider requires ProfileProvider only for cloud persistence.
 * Holiday palettes are date/session scoped CSS overrides — they never write to
 * fios_theme / fios_accent or the user profile.
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
  const [holidayTheme, setHolidayTheme] = useState<HolidayPalette | null>(() =>
    computeHolidayActive(null)
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => setSystemPref(mq.matches ? 'light' : 'dark');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const refresh = () => setHolidayTheme(computeHolidayActive(profile?.birthday));
    refresh();
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVis);
    const id = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVis);
      window.clearInterval(id);
    };
  }, [profile?.birthday]);

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

  useEffect(() => {
    if (holidayTheme) {
      applyHolidayPaletteVars(holidayTheme);
    } else {
      applyAccentVars(accent);
    }
  }, [accent, holidayTheme]);

  const setTheme = useCallback((t: ThemeMode) => {
    setAdminHolidayPreview(null);
    markHolidayManualOverride();
    setHolidayTheme(null);
    setThemeState(t);
    localStorage.setItem('fios_theme', t);
    applyResolvedTheme(t === 'system' ? resolveSystem() : t);
    applyAccentVars(normalizeAccent(localStorage.getItem('fios_accent')));
    updateProfile({ theme: t }).catch((e: any) => console.error('Failed to persist theme:', e));
  }, [updateProfile]);

  const toggleTheme = useCallback(() => {
    setAdminHolidayPreview(null);
    markHolidayManualOverride();
    setHolidayTheme(null);
    setThemeState((prev) => {
      const current = prev === 'system' ? systemPref : prev;
      const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('fios_theme', next);
      applyResolvedTheme(next);
      applyAccentVars(normalizeAccent(localStorage.getItem('fios_accent')));
      updateProfile({ theme: next }).catch((e: any) => console.error('Failed to persist theme:', e));
      return next;
    });
  }, [updateProfile, systemPref]);

  const setAccent = useCallback((a: AccentKey) => {
    setAdminHolidayPreview(null);
    markHolidayManualOverride();
    setHolidayTheme(null);
    const next = normalizeAccent(a);
    setAccentState(next);
    localStorage.setItem('fios_accent', next);
    applyAccentVars(next);
    updateProfile({ accent_color: next }).catch((e: any) => console.error('Failed to persist accent:', e));
  }, [updateProfile]);

  const previewHolidayTheme = useCallback((palette: HolidayPalette | null) => {
    if (palette) {
      setAdminHolidayPreview(palette.themeFamily);
      setHolidayTheme(palette);
      applyHolidayPaletteVars(palette);
    } else {
      setAdminHolidayPreview(null);
      // Fall back to birthday / calendar day-auto (if any) or saved accent
      const next = computeHolidayActive(profile?.birthday);
      setHolidayTheme(next);
      if (next) applyHolidayPaletteVars(next);
      else applyAccentVars(normalizeAccent(localStorage.getItem('fios_accent')));
    }
  }, [profile?.birthday]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      accent,
      holidayTheme,
      setTheme,
      toggleTheme,
      setAccent,
      previewHolidayTheme,
    }),
    [theme, resolvedTheme, accent, holidayTheme, setTheme, toggleTheme, setAccent, previewHolidayTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
