export interface SM2Item {
  easeFactor: number;
  /** Whole days for the SM-2 ladder (DB column is integer). Learning steps use 0. */
  interval: number;
  repetitions: number;
  nextReview: string;
}

/** Rating scale: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy */
export type SM2Rating = 1 | 2 | 3 | 4;

const MINUTE_MS = 60 * 1000;

/** Learning / relearn delays (not stored as day intervals — DB `interval` is integer). */
export const SM2_LEARN_MS = {
  again: 1 * MINUTE_MS,   // ~1m
  hard: 10 * MINUTE_MS,   // ~10m
  relearn: 10 * MINUTE_MS,
} as const;

/**
 * Local calendar midnight + N days, stored as ISO UTC.
 * Keeps “due today” aligned with the learner’s timezone instead of raw UTC day rolls.
 */
export function addLocalDays(days: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + Math.max(0, Math.round(days)));
  return d;
}

function addMs(ms: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + Math.max(0, Math.round(ms)));
}

/**
 * Card is due once its next_review timestamp has passed (or is missing/invalid).
 * Day-level schedules use local midnight, so a card due “today” stays due all day;
 * learning steps (minutes) leave the due queue until that time elapses.
 */
export function isCardDue(nextReview: string | null | undefined, now: Date = new Date()): boolean {
  if (!nextReview) return true;
  const next = new Date(nextReview);
  if (Number.isNaN(next.getTime())) return true;
  return next.getTime() <= now.getTime();
}

/**
 * SM-2 with Anki-style Hard/Easy (Hard does not wipe repetitions).
 * Again/Hard on new or lapsed cards use minute-scale next_review (interval stays 0);
 * Good/Easy graduate onto the day ladder. Labels must match next_review.
 */
export function calculateSM2(item: SM2Item, rating: number, now: Date = new Date()): SM2Item {
  let { easeFactor, interval, repetitions } = item;
  const q = Math.max(1, Math.min(4, Math.round(rating))) as SM2Rating;

  if (!Number.isFinite(easeFactor) || easeFactor <= 0) easeFactor = 2.5;
  if (!Number.isFinite(interval) || interval < 0) interval = 0;
  if (!Number.isFinite(repetitions) || repetitions < 0) repetitions = 0;
  // Integer-safe day ladder (matches Postgres `interval integer`)
  interval = Math.round(interval);

  let nextReviewDate: Date;

  if (q === 1) {
    // Again — full lapse; short relearn (not the same day as Good)
    repetitions = 0;
    interval = 0;
    nextReviewDate = addMs(SM2_LEARN_MS.again, now);
  } else if (q === 2) {
    // Hard — keep learning progress; modest interval growth (no incorrect reset)
    if (repetitions === 0) {
      // Still learning: ~10m, do not graduate onto the day ladder yet
      interval = 0;
      repetitions = 0;
      nextReviewDate = addMs(SM2_LEARN_MS.hard, now);
    } else {
      interval = Math.max(1, Math.round(interval * 1.2));
      repetitions += 1;
      nextReviewDate = addLocalDays(interval, now);
    }
  } else {
    // Good / Easy
    if (repetitions === 0) {
      interval = q === 4 ? 4 : 1;
    } else if (repetitions === 1) {
      interval = q === 4 ? 7 : 6;
    } else {
      const base = Math.max(1, interval);
      interval = Math.max(1, Math.round(base * easeFactor));
      if (q === 4) {
        interval = Math.max(interval + 1, Math.round(interval * 1.3));
      }
    }
    repetitions += 1;
    nextReviewDate = addLocalDays(interval, now);
  }

  // Classic SM-2 EF update; map Easy(4) → quality 5 for a stronger positive bump
  const quality = q === 4 ? 5 : q;
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  return {
    easeFactor: Number(easeFactor.toFixed(2)),
    interval,
    repetitions,
    nextReview: nextReviewDate.toISOString(),
  };
}

/** Preview the interval (days) a rating would produce — 0 means a sub-day learning step. */
export function previewIntervalDays(item: SM2Item, rating: number, now: Date = new Date()): number {
  return calculateSM2(item, rating, now).interval;
}

/** Human label for whole-day intervals. */
export function formatIntervalLabel(days: number): string {
  if (!Number.isFinite(days) || days <= 0) return 'today';
  if (days === 1) return '1d';
  if (days < 30) return `${Math.round(days)}d`;
  const months = Math.round(days / 30);
  return months <= 1 ? '1mo' : `${months}mo`;
}

/**
 * Rating-button preview that matches what calculateSM2 actually schedules
 * (minutes for Again/Hard learning; days for Good/Easy and graduated Hard).
 */
export function previewIntervalLabel(item: SM2Item, rating: number, now: Date = new Date()): string {
  const result = calculateSM2(item, rating, now);
  if (result.interval >= 1) return formatIntervalLabel(result.interval);
  const ms = new Date(result.nextReview).getTime() - now.getTime();
  const minutes = Math.max(1, Math.round(ms / MINUTE_MS));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.max(1, Math.round(minutes / 60));
  return `${hours}h`;
}

export default calculateSM2;
