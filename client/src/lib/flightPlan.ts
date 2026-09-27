/**
 * Rewrite flightPlan with smarter intent routing + richer step payloads.
 */
import { getUserModules } from './moduleService';
import { getUserDecksWithCards } from './deckService';
import { getQuizzes } from './mcqService';
import { getCodeExams } from './codeExamService';
import { isCardDue } from './spacedRepetition';

export type FlightIntent = 'review' | 'quiz' | 'code' | 'make' | 'recall';

export interface FlightStep {
  id: string;
  action: string;
  reason: string;
  moduleCode: string | null;
  /** Dashboard tab fallback */
  tab: string;
  score: number;
  intent: FlightIntent;
  /** Optional deck cards for review sessions */
  deckCards?: any[];
  deckTitle?: string;
  quizId?: string;
  codeExamId?: string;
}

function readiness(decks: number, quizzes: number, code: number): number {
  return Math.min(40, decks * 20) + Math.min(30, quizzes * 15) + Math.min(30, code * 15);
}

function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr).getTime();
  if (Number.isNaN(d)) return null;
  return Math.ceil((d - Date.now()) / 86400_000);
}

/**
 * Build a prioritized daily study plan from exam proximity, due SM-2 cards, and readiness.
 * "Review" steps carry due cards so the UI opens an SM-2 session (not Modules dump).
 * "Run" / "Make" steps target quiz / code / generator tabs.
 */
export async function computeFlightPlan(): Promise<FlightStep[]> {
  const [modules, decks, quizzes, code] = await Promise.all([
    getUserModules(), getUserDecksWithCards(), getQuizzes(), getCodeExams(),
  ]);

  const candidates: FlightStep[] = [];

  for (const m of modules) {
    const mDecks = (decks || []).filter((d: any) => d.module_code === m.code);
    const mQuizzes = quizzes.filter((q) => q.module_code === m.code);
    const mCode = code.filter((c) => c.module_code === m.code);
    const score100 = readiness(mDecks.length, mQuizzes.length, mCode.length);

    const dueFromDecks: { cards: any[]; title: string }[] = [];
    let dueCount = 0;
    for (const d of mDecks) {
      const due = ((d as any).cards || []).filter((c: any) => isCardDue(c.next_review));
      if (due.length) {
        dueFromDecks.push({ cards: due, title: (d as any).title || m.name });
        dueCount += due.length;
      }
    }

    const dLeft = daysUntil(m.exam_date);
    const examBonus = dLeft !== null ? Math.max(0, 40 - dLeft * 3) : 0;

    if (dueCount > 0) {
      const allDue = dueFromDecks.flatMap((x) => x.cards);
      const primaryTitle = dueFromDecks[0]?.title || `${m.name} review`;
      candidates.push({
        id: `${m.code}-cards`,
        action: `Review ${dueCount} due ${m.name} flashcard${dueCount === 1 ? '' : 's'}`,
        reason: dLeft !== null && dLeft <= 10 ? `Exam in ${dLeft} day${dLeft === 1 ? '' : 's'}` : 'Spaced repetition due',
        moduleCode: m.code,
        tab: 'flashcards',
        score: 45 + dueCount * 2 + examBonus,
        intent: 'review',
        deckCards: allDue,
        deckTitle: primaryTitle,
      });
    }

    if (score100 < 70) {
      if (mCode.length === 0) {
        candidates.push({
          id: `${m.code}-code`,
          action: `Run a Code Exam for ${m.name}`,
          reason: `Readiness only ${score100}%`,
          moduleCode: m.code,
          tab: 'code',
          score: 25 + (70 - score100) / 2 + examBonus,
          intent: 'code',
        });
      } else if (mQuizzes.length === 0) {
        candidates.push({
          id: `${m.code}-quiz`,
          action: `Make an MCQ quiz for ${m.name}`,
          reason: `Readiness only ${score100}%`,
          moduleCode: m.code,
          tab: 'quiz',
          score: 25 + (70 - score100) / 2 + examBonus,
          intent: 'make',
        });
      } else {
        const q = mQuizzes[0];
        candidates.push({
          id: `${m.code}-recall`,
          action: `Take ${q.title} for ${m.name}`,
          reason: `Readiness only ${score100}%`,
          moduleCode: m.code,
          tab: 'quiz',
          score: 25 + (70 - score100) / 2 + examBonus,
          intent: 'quiz',
          quizId: q.id,
        });
      }
    }

    if (dLeft !== null && dLeft >= 0 && dLeft <= 14) {
      candidates.push({
        id: `${m.code}-exam`,
        action: `Active recall blurt for ${m.name}`,
        reason: `Exam in ${dLeft} day${dLeft === 1 ? '' : 's'}`,
        moduleCode: m.code,
        tab: 'modules',
        score: 20 + examBonus,
        intent: 'recall',
      });
    }
  }

  const seen = new Set<string>();
  return candidates
    .sort((a, b) => b.score - a.score)
    .filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    })
    .slice(0, 3);
}
