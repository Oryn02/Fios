/**
 * Overview holiday greetings + day-only app accent palettes.
 * Landing stays locked to emerald via `lockLandingBrand` — these apply to the app shell only.
 * Admin can preview curated holiday palettes any day via AdminPanel (not public docs).
 * Birthday is user-profile scoped (month/day) — not a fixed calendar holiday.
 */

export type HolidayId =
  | 'new-year'
  | 'valentine'
  | 'st-patrick'
  | 'easter'
  | 'halloween'
  | 'christmas-eve'
  | 'christmas'
  | 'st-stephens'
  | 'birthday';

export interface HolidayPalette {
  id: HolidayId;
  name: string;
  /** Greeting fragment after "Happy " (e.g. "Christmas Eve") */
  greetingName: string;
  /** Short label for Settings / Updates */
  label: string;
  from: string;
  via: string;
  to: string;
  solid: string;
  /** Optional soft surface tint (data attribute for CSS hooks) */
  mood: 'warm' | 'cool' | 'festive' | 'pastel';
  /** Shared theme family — Christmas Eve/Day/St Stephen’s share one palette */
  themeFamily: string;
}

/**
 * Birthday celebration palette — coral → gold → teal (festive, not purple-default).
 * Applied when the signed-in user's profile birthday month/day matches today,
 * or via admin session preview.
 */
export const BIRTHDAY_PALETTE: HolidayPalette = {
  id: 'birthday',
  name: 'Birthday',
  greetingName: 'Birthday',
  label: 'Birthday Coral & Gold',
  from: '#fb7185',
  via: '#fbbf24',
  to: '#2dd4bf',
  solid: '#f59e0b',
  mood: 'festive',
  themeFamily: 'birthday',
};

/** Normalize profile birthday to YYYY-MM-DD, or null. */
export function normalizeBirthday(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const m = raw.trim().slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** True when profile birthday month/day matches the local calendar day. */
export function isBirthdayToday(
  birthday: string | null | undefined,
  date: Date = new Date()
): boolean {
  const norm = normalizeBirthday(birthday);
  if (!norm) return false;
  const [, mo, d] = norm.split('-').map(Number);
  return date.getMonth() + 1 === mo && date.getDate() === d;
}

/** Birthday accent palette when today is the user's birthday; otherwise null. */
export function birthdayPalette(
  birthday: string | null | undefined,
  date: Date = new Date()
): HolidayPalette | null {
  return isBirthdayToday(birthday, date) ? BIRTHDAY_PALETTE : null;
}

export function timeOfDayGreeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Anonymous Gregorian Easter (Meeus/Jones/Butcher). */
export function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/** Shared Christmas holly palette (Dec 24–26). */
const CHRISTMAS_PALETTE = {
  label: 'Christmas Holly',
  from: '#fca5a5',
  via: '#ef4444',
  to: '#166534',
  solid: '#ef4444',
  mood: 'festive' as const,
  themeFamily: 'christmas',
};

interface HolidayDef {
  id: HolidayId;
  name: string;
  greetingName: string;
  match: (year: number, month: number, day: number) => boolean;
  palette: Omit<HolidayPalette, 'id' | 'name' | 'greetingName'>;
}

/**
 * Distinct, readable holiday accents — not garish; still work on dark Fios chrome.
 * Halloween: amber/orange. Christmas family (Eve–St Stephen’s): soft crimson + pine.
 * St Patrick’s: kelly green + soft gold. Easter: lilac / blush pastels.
 */
const HOLIDAYS: HolidayDef[] = [
  {
    id: 'new-year',
    name: "New Year's Day",
    greetingName: "New Year's Day",
    match: (_y, m, d) => m === 1 && d === 1,
    palette: {
      label: 'New Year Champagne',
      from: '#fde68a',
      via: '#fbbf24',
      to: '#a78bfa',
      solid: '#fbbf24',
      mood: 'festive',
      themeFamily: 'new-year',
    },
  },
  {
    id: 'valentine',
    name: "Valentine's Day",
    greetingName: "Valentine's Day",
    match: (_y, m, d) => m === 2 && d === 14,
    palette: {
      label: 'Valentine Rose',
      from: '#fda4af',
      via: '#fb7185',
      to: '#e11d48',
      solid: '#fb7185',
      mood: 'warm',
      themeFamily: 'valentine',
    },
  },
  {
    id: 'st-patrick',
    name: "St Patrick's Day",
    greetingName: "St Patrick's Day",
    match: (_y, m, d) => m === 3 && d === 17,
    palette: {
      label: "St Patrick's Green & Gold",
      from: '#86efac',
      via: '#22c55e',
      to: '#ca8a04',
      solid: '#22c55e',
      mood: 'festive',
      themeFamily: 'st-patrick',
    },
  },
  {
    id: 'easter',
    name: 'Easter',
    greetingName: 'Easter',
    match: (y, m, d) => {
      const e = easterSunday(y);
      return m === e.month && d === e.day;
    },
    palette: {
      label: 'Easter Pastels',
      from: '#ddd6fe',
      via: '#fbcfe8',
      to: '#a5f3fc',
      solid: '#c4b5fd',
      mood: 'pastel',
      themeFamily: 'easter',
    },
  },
  {
    id: 'halloween',
    name: 'Halloween',
    greetingName: 'Halloween',
    match: (_y, m, d) => m === 10 && d === 31,
    palette: {
      label: 'Halloween Ember',
      from: '#fdba74',
      via: '#f97316',
      to: '#9a3412',
      solid: '#f97316',
      mood: 'warm',
      themeFamily: 'halloween',
    },
  },
  {
    id: 'christmas-eve',
    name: 'Christmas Eve',
    greetingName: 'Christmas Eve',
    match: (_y, m, d) => m === 12 && d === 24,
    palette: { ...CHRISTMAS_PALETTE },
  },
  {
    id: 'christmas',
    name: 'Christmas',
    greetingName: 'Christmas',
    match: (_y, m, d) => m === 12 && d === 25,
    palette: { ...CHRISTMAS_PALETTE },
  },
  {
    id: 'st-stephens',
    name: "St Stephen's Day",
    greetingName: "St Stephen's Day",
    match: (_y, m, d) => m === 12 && d === 26,
    palette: { ...CHRISTMAS_PALETTE },
  },
];

/** Curated admin preview list — one entry per theme family (Christmas shared for Eve–26). */
export const ADMIN_HOLIDAY_PREVIEWS: HolidayPalette[] = (() => {
  const wanted = new Set(['halloween', 'christmas', 'easter', 'st-patrick', 'birthday']);
  const out: HolidayPalette[] = [];
  const seen = new Set<string>();
  for (const h of HOLIDAYS) {
    if (!wanted.has(h.palette.themeFamily)) continue;
    if (seen.has(h.palette.themeFamily)) continue;
    seen.add(h.palette.themeFamily);
    out.push({
      id: h.id,
      name: h.palette.themeFamily === 'christmas' ? 'Christmas' : h.name,
      greetingName: h.greetingName,
      ...h.palette,
    });
  }
  if (!seen.has('birthday')) out.push(BIRTHDAY_PALETTE);
  return out;
})();

function localDayKey(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Active holiday for a local calendar day, or null. */
export function holidayForDate(date: Date = new Date()): HolidayDef | null {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  for (const h of HOLIDAYS) {
    if (h.match(y, m, d)) return h;
  }
  return null;
}

/** Returns e.g. "Happy Christmas Eve" or null on ordinary days. */
export function holidayGreeting(date: Date = new Date()): string | null {
  const h = holidayForDate(date);
  return h ? `Happy ${h.greetingName}` : null;
}

/**
 * Overview header greeting.
 * Priority: birthday (personal) → calendar holiday → time-of-day.
 * Overview always appends ", {preferredName}." after this string.
 */
export function overviewGreeting(
  date: Date = new Date(),
  birthday?: string | null
): string {
  if (isBirthdayToday(birthday, date)) return 'Happy Birthday';
  return holidayGreeting(date) || timeOfDayGreeting(date);
}

/** Day-only accent palette for the app shell (never written to profile). */
export function holidayPalette(date: Date = new Date()): HolidayPalette | null {
  const h = holidayForDate(date);
  if (!h) return null;
  return {
    id: h.id,
    name: h.name,
    greetingName: h.greetingName,
    ...h.palette,
  };
}

const MANUAL_PREFIX = 'fios_holiday_manual_';
const ADMIN_PREVIEW_KEY = 'fios_admin_holiday_preview';

/** User explicitly changed theme/accent on this local day — skip auto holiday palette. */
export function markHolidayManualOverride(date: Date = new Date()): void {
  try {
    localStorage.setItem(`${MANUAL_PREFIX}${localDayKey(date)}`, '1');
  } catch {
    /* private mode */
  }
}

export function clearStaleHolidayManualFlags(date: Date = new Date()): void {
  try {
    const keep = `${MANUAL_PREFIX}${localDayKey(date)}`;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(MANUAL_PREFIX) && k !== keep) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* noop */
  }
}

export function hasHolidayManualOverride(date: Date = new Date()): boolean {
  try {
    return localStorage.getItem(`${MANUAL_PREFIX}${localDayKey(date)}`) === '1';
  } catch {
    return false;
  }
}

/** Persist admin holiday preview for this browser session (sessionStorage). */
export function setAdminHolidayPreview(themeFamily: string | null): void {
  try {
    if (!themeFamily) sessionStorage.removeItem(ADMIN_PREVIEW_KEY);
    else sessionStorage.setItem(ADMIN_PREVIEW_KEY, themeFamily);
  } catch {
    /* noop */
  }
}

export function getAdminHolidayPreview(): HolidayPalette | null {
  try {
    const fam = sessionStorage.getItem(ADMIN_PREVIEW_KEY);
    if (!fam) return null;
    return ADMIN_HOLIDAY_PREVIEWS.find((p) => p.themeFamily === fam) || null;
  } catch {
    return null;
  }
}

/**
 * Apply holiday CSS vars to the document (session/date scoped).
 * Does not touch fios_theme / fios_accent / profile.
 * No-ops while landing brand lock is active.
 * Uses themeFamily for data-holiday so Dec 24–26 share `christmas`.
 */
export function applyHolidayPaletteVars(palette: HolidayPalette | null): void {
  const root = document.documentElement;
  if (root.getAttribute('data-landing-active') === 'true') return;

  if (!palette) {
    root.removeAttribute('data-holiday');
    root.removeAttribute('data-holiday-mood');
    return;
  }

  root.style.setProperty('--fios-accent-from', palette.from);
  root.style.setProperty('--fios-accent-via', palette.via);
  root.style.setProperty('--fios-accent-to', palette.to);
  root.style.setProperty('--fios-accent-solid', palette.solid);
  root.dataset.holiday = palette.themeFamily;
  root.dataset.holidayMood = palette.mood;
  root.dataset.accent = `holiday-${palette.themeFamily}`;
}
