export interface SM2Item {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: string;
}

/**
 * Calculates SM-2 spaced repetition values based on confidence rating.
 * Rating scale: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
 */
export function calculateSM2(item: SM2Item, rating: number): SM2Item {
  let { easeFactor, interval, repetitions } = item;

  if (rating >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  // Adjust Ease Factor based on quality rating
  easeFactor = easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    easeFactor: Number(easeFactor.toFixed(2)),
    interval,
    repetitions,
    nextReview: nextReviewDate.toISOString(),
  };
}

// Fallback default export to satisfy ESM bundlers
export default calculateSM2;