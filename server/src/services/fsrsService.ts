import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  type Card as FsrsCard,
  type Grade,
} from 'ts-fsrs';

export type FsrsRating = 1 | 2 | 3 | 4;

export type StoredFsrsState = {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: string | null;
};

function ratingToFsrs(rating: FsrsRating): Grade {
  // Map Again/Hard/Good/Easy → ts-fsrs Rating
  switch (rating) {
    case 1:
      return Rating.Again;
    case 2:
      return Rating.Hard;
    case 3:
      return Rating.Good;
    case 4:
      return Rating.Easy;
    default:
      return Rating.Good;
  }
}

function toFsrsCard(state: StoredFsrsState | null | undefined): FsrsCard {
  if (!state) return createEmptyCard(new Date());
  const card = createEmptyCard(new Date());
  card.due = new Date(state.due);
  card.stability = state.stability;
  card.difficulty = state.difficulty;
  card.elapsed_days = state.elapsed_days;
  card.scheduled_days = state.scheduled_days;
  card.reps = state.reps;
  card.lapses = state.lapses;
  card.state = state.state as FsrsCard['state'];
  card.last_review = state.last_review ? new Date(state.last_review) : undefined;
  return card;
}

function fromFsrsCard(card: FsrsCard): StoredFsrsState {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: Number(card.state),
    last_review: card.last_review ? card.last_review.toISOString() : null,
  };
}

/**
 * Schedule one review with FSRS. Also returns SM-2-compatible next_review / interval
 * so due-queue filters keep working.
 */
export function reviewWithFsrs(
  previous: StoredFsrsState | null | undefined,
  rating: FsrsRating,
  now: Date = new Date()
): {
  stateBefore: StoredFsrsState | null;
  stateAfter: StoredFsrsState;
  nextReview: string;
  intervalDays: number;
  repetitions: number;
} {
  const requestRetention = Number(process.env.FSRS_REQUEST_RETENTION) || 0.9;
  const scheduler = fsrs(
    generatorParameters({
      request_retention: Math.min(0.99, Math.max(0.7, requestRetention)),
      enable_fuzz: true,
    })
  );
  const before = previous ? { ...previous } : null;
  const card = toFsrsCard(previous);
  const result = scheduler.next(card, now, ratingToFsrs(rating));
  const after = fromFsrsCard(result.card);
  const intervalDays = Math.max(0, Math.round(result.card.scheduled_days || 0));
  return {
    stateBefore: before,
    stateAfter: after,
    nextReview: after.due,
    intervalDays,
    repetitions: after.reps,
  };
}
