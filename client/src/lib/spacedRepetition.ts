export interface SM2Item {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: string;
}

/** Rating scale: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy */
export type SM2Rating = 1 | 2 | 3 | 4;

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

/**
 * Card is due if it has no next_review, an invalid date, or its next review
 * falls before local start-of-tomorrow (i.e. due sometime today or earlier).
 */
export function isCardDue(nextReview: string | null | undefined, now: Date = new Date()): boolean {
  if (!nextReview) return true;
  const next = new Date(nextReview);
  if (Number.isNaN(next.getTime())) return true;
  const startTomorrow = addLocalDays(1, now);
  return next.getTime() < startTomorrow.getTime();
}

/**
 * SM-2 with Anki-style Hard/Easy (Hard does not wipe repetitions).
 * Again (1) lapses; Hard (2) short bump; Good (3) classic ladder; Easy (4) longer steps + EF boost.
 */
export function calculateSM2(item: SM2Item, rating: number): SM2Item {
  let { easeFactor, interval, repetitions } = item;
  const q = Math.max(1, Math.min(4, Math.round(rating))) as SM2Rating;

  if (!Number.isFinite(easeFactor) || easeFactor <= 0) easeFactor = 2.5;
  if (!Number.isFinite(interval) || interval < 0) interval = 0;
  if (!Number.isFinite(repetitions) || repetitions < 0) repetitions = 0;

  if (q === 1) {
    // Again — full lapse; back in tomorrow’s queue
    repetitions = 0;
    interval = 1;
  } else if (q === 2) {
    // Hard — keep learning progress; modest interval growth (no incorrect reset)
    if (repetitions === 0) {
      interval = 1;
      repetitions = 1;
    } else {
      interval = Math.max(1, Math.round(interval * 1.2));
      repetitions += 1;
    }
  } else {
    // Good / Easy
    if (repetitions === 0) {
      interval = q === 4 ? 4 : 1;
    } else if (repetitions === 1) {
      interval = q === 4 ? 7 : 6;
    } else {
      interval = Math.max(1, Math.round(interval * easeFactor));
      if (q === 4) {
        interval = Math.max(interval + 1, Math.round(interval * 1.3));
      }
    }
    repetitions += 1;
  }

  // Classic SM-2 EF update; map Easy(4) → quality 5 for a stronger positive bump
  const quality = q === 4 ? 5 : q;
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const nextReviewDate = addLocalDays(interval);

  return {
    easeFactor: Number(easeFactor.toFixed(2)),
    interval,
    repetitions,
    nextReview: nextReviewDate.toISOString(),
  };
}

/** Preview the interval (days) a rating would produce without mutating storage. */
export function previewIntervalDays(item: SM2Item, rating: number): number {
  return calculateSM2(item, rating).interval;
}

export function formatIntervalLabel(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return '1d';
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  return months <= 1 ? '1mo' : `${months}mo`;
}

export default calculateSM2;
