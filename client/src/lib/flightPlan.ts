import { getUserModules } from './moduleService';
import { getUserDecksWithCards } from './deckService';
import { getQuizzes } from './mcqService';
import { getCodeExams } from './codeExamService';

export interface FlightStep {
  id: string;
  action: string;       // e.g. "Review 10 overdue C Pointers cards"
  reason: string;       // why it's prioritized
  moduleCode: string | null;
  tab: string;          // dashboard tab to jump to
  score: number;
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
 * Build a prioritized daily study plan from three signals:
 *  1. Exam proximity (days until a module's exam_date)
 *  2. Overdue / due SM-2 flashcards (next_review <= now, or never reviewed)
 *  3. Low module readiness (< 70%)
 */
export async function computeFlightPlan(): Promise<FlightStep[]> {
  const [modules, decks, quizzes, code] = await Promise.all([
    getUserModules(), getUserDecksWithCards(), getQuizzes(), getCodeExams(),
  ]);

  const now = Date.now();
  const candidates: FlightStep[] = [];

  for (const m of modules) {
    const mDecks = (decks || []).filter((d: any) => d.module_code === m.code);
    const mQuizzes = quizzes.filter((q) => q.module_code === m.code).length;
    const mCode = code.filter((c) => c.module_code === m.code).length;
    const score100 = readiness(mDecks.length, mQuizzes, mCode);

    const dueCards = mDecks.reduce((sum: number, d: any) => {
      const cards = d.cards || [];
      return sum + cards.filter((c: any) => !c.next_review || new Date(c.next_review).getTime() <= now).length;
    }, 0);

    const dLeft = daysUntil(m.exam_date);
    const examBonus = dLeft !== null ? Math.max(0, 40 - dLeft * 3) : 0;

    if (dueCards > 0) {
      candidates.push({
        id: `${m.code}-cards`,
        action: `Review ${dueCards} due ${m.name} flashcard${dueCards === 1 ? '' : 's'}`,
        reason: dLeft !== null && dLeft <= 10 ? `Exam in ${dLeft} day${dLeft === 1 ? '' : 's'}` : 'Spaced repetition due',
        moduleCode: m.code, tab: 'modules', score: 45 + dueCards * 2 + examBonus,
      });
    }

    if (score100 < 70) {
      const gap = mCode === 0 ? 'code' : mQuizzes === 0 ? 'quiz' : 'recall';
      candidates.push({
        id: `${m.code}-${gap}`,
        action: gap === 'code'
          ? `Run a Code Exam for ${m.name}`
          : gap === 'quiz'
            ? `Take an MCQ quiz for ${m.name}`
            : `Active recall on ${m.name}`,
        reason: `Readiness only ${score100}%`,
        moduleCode: m.code,
        tab: gap === 'code' ? 'code' : gap === 'quiz' ? 'quiz' : 'modules',
        score: 25 + (70 - score100) / 2 + examBonus,
      });
    }

    if (dLeft !== null && dLeft >= 0 && dLeft <= 14) {
      candidates.push({
        id: `${m.code}-exam`,
        action: `Active recall blurt for ${m.name}`,
        reason: `Exam in ${dLeft} day${dLeft === 1 ? '' : 's'}`,
        moduleCode: m.code, tab: 'modules', score: 20 + examBonus,
      });
    }
  }

  // Dedupe by module (keep highest), then take top 3 overall.
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
