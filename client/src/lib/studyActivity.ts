/**
 * Aggregates daily study activity for the contribution heatmap / streak widget.
 * Sources: focus_sessions (minutes) + local flashcard review log (`fios_review_days`).
 */
import { getFocusSessions } from './focusService';

const REVIEW_DAYS_KEY = 'fios_review_days';

export interface DayActivity {
  /** YYYY-MM-DD */
  date: string;
  /** Focus minutes that day */
  minutes: number;
  /** Flashcard review count that day */
  reviews: number;
  /** Combined intensity 0–4 for heatmap cells */
  level: number;
}

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

/** Record a flashcard SM-2 rating day in localStorage. */
export function recordFlashcardReview(at: Date = new Date()): void {
  try {
    const key = dayKey(at);
    const raw = localStorage.getItem(REVIEW_DAYS_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    map[key] = (map[key] || 0) + 1;
    localStorage.setItem(REVIEW_DAYS_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / private mode */
  }
}

function loadReviewDays(): Record<string, number> {
  try {
    const raw = localStorage.getItem(REVIEW_DAYS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function intensity(minutes: number, reviews: number): number {
  const score = minutes / 15 + reviews;
  if (score <= 0) return 0;
  if (score < 1) return 1;
  if (score < 3) return 2;
  if (score < 6) return 3;
  return 4;
}

/** Build day activity map for the past `weeks` weeks (ending today). */
export async function getStudyActivity(weeks = 52): Promise<DayActivity[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7 - 1));

  const sessions = await getFocusSessions(start.toISOString());
  const reviews = loadReviewDays();

  const byDay = new Map<string, { minutes: number; reviews: number }>();

  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    byDay.set(dayKey(d), { minutes: 0, reviews: 0 });
  }

  for (const s of sessions) {
    if (s.mode && s.mode !== 'work') continue;
    const key = dayKey(new Date(s.created_at));
    const row = byDay.get(key);
    if (row) row.minutes += s.minutes || 0;
  }

  for (const [key, count] of Object.entries(reviews)) {
    const row = byDay.get(key);
    if (row) row.reviews += count;
  }

  const days: DayActivity[] = [];
  for (const [date, v] of byDay) {
    days.push({
      date,
      minutes: v.minutes,
      reviews: v.reviews,
      level: intensity(v.minutes, v.reviews),
    });
  }
  days.sort((a, b) => a.date.localeCompare(b.date));
  return days;
}

export function computeStreaks(days: DayActivity[]): { current: number; longest: number } {
  const active = new Set(days.filter((d) => d.level > 0).map((d) => d.date));
  if (active.size === 0) return { current: 0, longest: 0 };

  const today = dayKey(new Date());
  let current = 0;
  let cursor = parseDay(today);
  // Allow streak to count from yesterday if today is empty (still in progress)
  if (!active.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (active.has(dayKey(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sorted = [...active].sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of sorted) {
    const d = parseDay(key);
    if (prev) {
      const diff = (d.getTime() - prev.getTime()) / 86400000;
      run = diff === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = d;
  }

  return { current, longest };
}
