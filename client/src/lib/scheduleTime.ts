/**
 * Schedule visual-state helpers — finished vs upcoming vs in-progress classes.
 * Works for iCal-synced and manual expanded events.
 */

export type ClassVisualState = 'finished' | 'ongoing' | 'next' | 'upcoming' | 'past-day';

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isPastLocalDay(day: Date, now: Date = new Date()): boolean {
  const d = new Date(day);
  d.setHours(23, 59, 59, 999);
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  return d < startToday;
}

/** Class has fully ended (now > end). */
export function isClassFinished(end: Date, now: Date = new Date()): boolean {
  return now.getTime() > end.getTime();
}

/** Class is currently in session. */
export function isClassOngoing(start: Date, end: Date, now: Date = new Date()): boolean {
  const t = now.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

/**
 * Index of the immediate next upcoming class in a same-day list (by start time).
 * Prefers the first event whose start is still in the future; if one is ongoing,
 * the next after it. Returns -1 when none.
 */
export function findNextUpcomingIndex(
  events: { startDate: Date; endDate: Date }[],
  now: Date = new Date()
): number {
  const sorted = events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => a.e.startDate.getTime() - b.e.startDate.getTime());

  for (const { e, i } of sorted) {
    if (e.startDate.getTime() > now.getTime()) return i;
  }
  return -1;
}

export function classVisualState(
  start: Date,
  end: Date,
  opts: { day?: Date; now?: Date; isNext?: boolean } = {}
): ClassVisualState {
  const now = opts.now ?? new Date();
  const day = opts.day ?? start;

  if (isPastLocalDay(day, now)) return 'past-day';
  if (!isSameLocalDay(day, now)) return 'upcoming';
  if (isClassFinished(end, now)) return 'finished';
  if (isClassOngoing(start, end, now)) return 'ongoing';
  if (opts.isNext) return 'next';
  return 'upcoming';
}

/** Card shell classes for schedule / overview class rows. */
export function classStateCardClass(state: ClassVisualState): string {
  switch (state) {
    case 'finished':
    case 'past-day':
      return 'opacity-45 border-slate-800/50 border-l-4 border-l-slate-600 grayscale-[0.35]';
    case 'ongoing':
      return 'border-emerald-400 border-l-8 border-l-emerald-400 bg-emerald-950/20 shadow-[0_0_20px_rgba(52,211,153,0.12)]';
    case 'next':
      return 'accent-border border-l-4 mod-card-accent bg-[color-mix(in_srgb,var(--mod-solid)_12%,transparent)] shadow-lg';
    default:
      return 'border-slate-800 border-l-4 mod-card-accent hover:border-slate-700';
  }
}
