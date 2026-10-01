/**
 * Study milestone metrics for immersive theme unlocks.
 * Aggregates local counters + best-effort Supabase reads.
 */
import { supabase } from './supabase';
import { IS_DEMO } from './demo';
import { levelFromXp } from './rpg';
import { peekSavedCalendarUrl } from './scheduleService';
import type { StudyMetrics } from './rpgThemeRegistry';
import {
  IMMERSIVE_THEMES,
  isThemeUnlockedByMetrics,
  type ImmersiveThemeDef,
} from './rpgThemeRegistry';

const METRICS_KEY = 'fios_study_metrics_v41';
const REWARDS_KEY = 'fios_unlocked_rewards';

export type StoredMetrics = {
  codeChallenges: number;
  nightSessions: number;
  pomodoroMinutes: number;
  mockExamStreak95: number;
  courseBankShares: number;
  fsrsReviews: number;
  studySessions: number;
  hardMockPerfect: boolean;
  graveyardSessions: boolean;
  moduleMastered: boolean;
  perfectDeckReview: boolean;
  mobileStudyMinutes: number;
  sundayStudy: boolean;
  rainyStudy: boolean;
  aiGenerations: number;
  flashcardTouches: number;
  weekendStreak3: boolean;
  tutorChats: number;
  hubStudyMinutes: number;
  lastMockScores: number[];
  streakDaysSeen: string[];
};

function empty(): StoredMetrics {
  return {
    codeChallenges: 0,
    nightSessions: 0,
    pomodoroMinutes: 0,
    mockExamStreak95: 0,
    courseBankShares: 0,
    fsrsReviews: 0,
    studySessions: 0,
    hardMockPerfect: false,
    graveyardSessions: false,
    moduleMastered: false,
    perfectDeckReview: false,
    mobileStudyMinutes: 0,
    sundayStudy: false,
    rainyStudy: false,
    aiGenerations: 0,
    flashcardTouches: 0,
    weekendStreak3: false,
    tutorChats: 0,
    hubStudyMinutes: 0,
    lastMockScores: [],
    streakDaysSeen: [],
  };
}

function loadLocal(): StoredMetrics {
  try {
    const raw = localStorage.getItem(METRICS_KEY);
    if (!raw) return empty();
    return { ...empty(), ...JSON.parse(raw) };
  } catch {
    return empty();
  }
}

function saveLocal(m: StoredMetrics) {
  try {
    localStorage.setItem(METRICS_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

function patchLocal(partial: Partial<StoredMetrics>) {
  const next = { ...loadLocal(), ...partial };
  saveLocal(next);
  return next;
}

function isMobileViewport(): boolean {
  try {
    return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
  } catch {
    return false;
  }
}

function maybeNightOrGraveyard() {
  const hour = new Date().getHours();
  const dayKey = new Date().toISOString().slice(0, 10);
  if (hour >= 22 || hour < 5) {
    try {
      const last = localStorage.getItem('fios_night_session_day');
      if (last !== dayKey) {
        localStorage.setItem('fios_night_session_day', dayKey);
        const m = loadLocal();
        patchLocal({ nightSessions: m.nightSessions + 1 });
      }
    } catch {
      /* ignore */
    }
  }
  if (hour >= 2 && hour < 5) {
    patchLocal({ graveyardSessions: true });
  }
  if (new Date().getDay() === 0) {
    patchLocal({ sundayStudy: true });
  }
}

function noteStreakDay() {
  const day = new Date().toISOString().slice(0, 10);
  const m = loadLocal();
  const seen = [...new Set([...(m.streakDaysSeen || []), day])].slice(-14);
  // weekend spanning 3-day: any 3 consecutive days that include Sat+Sun
  let weekendStreak3 = m.weekendStreak3;
  if (seen.length >= 3) {
    for (let i = 0; i <= seen.length - 3; i++) {
      const slice = seen.slice(i, i + 3).map((d) => new Date(d + 'T12:00:00'));
      const days = slice.map((d) => d.getDay());
      const consecutive =
        slice[1].getTime() - slice[0].getTime() === 86400000 &&
        slice[2].getTime() - slice[1].getTime() === 86400000;
      if (consecutive && days.includes(0) && days.includes(6)) weekendStreak3 = true;
    }
  }
  patchLocal({ streakDaysSeen: seen, weekendStreak3 });
}

/** Call when any meaningful study action happens. */
export function recordStudySessionTouch() {
  const m = loadLocal();
  const dayKey = `session:${new Date().toISOString().slice(0, 10)}`;
  try {
    const last = localStorage.getItem('fios_session_touch_day');
    if (last !== dayKey) {
      localStorage.setItem('fios_session_touch_day', dayKey);
      patchLocal({ studySessions: m.studySessions + 1 });
    }
  } catch {
    patchLocal({ studySessions: m.studySessions + 1 });
  }
  maybeNightOrGraveyard();
  noteStreakDay();
}

export function recordCodeChallengeComplete() {
  const m = loadLocal();
  patchLocal({ codeChallenges: m.codeChallenges + 1 });
  recordStudySessionTouch();
}

export function recordPomodoroMinutes(mins: number) {
  if (mins <= 0) return;
  const m = loadLocal();
  const next: Partial<StoredMetrics> = { pomodoroMinutes: m.pomodoroMinutes + mins };
  if (isMobileViewport()) next.mobileStudyMinutes = m.mobileStudyMinutes + mins;
  // Hub/Overview/Agenda time approximates via total focus minutes
  next.hubStudyMinutes = m.hubStudyMinutes + mins;
  patchLocal(next);
  recordStudySessionTouch();
}

export function recordFsrsReview(count = 1) {
  const m = loadLocal();
  patchLocal({
    fsrsReviews: m.fsrsReviews + count,
    flashcardTouches: m.flashcardTouches + count,
  });
  recordStudySessionTouch();
}

export function recordFlashcardTouch(count = 1) {
  const m = loadLocal();
  patchLocal({ flashcardTouches: m.flashcardTouches + count });
  recordStudySessionTouch();
}

export function recordMockExamScore(pct: number, opts?: { hard?: boolean }) {
  const m = loadLocal();
  const scores = [...(m.lastMockScores || []), pct].slice(-10);
  let streak = 0;
  for (let i = scores.length - 1; i >= 0; i--) {
    if (scores[i] >= 95) streak += 1;
    else break;
  }
  const hardMockPerfect = m.hardMockPerfect || (Boolean(opts?.hard) && pct >= 100);
  patchLocal({ lastMockScores: scores, mockExamStreak95: streak, hardMockPerfect });
  recordStudySessionTouch();
}

export function recordCourseBankShare() {
  const m = loadLocal();
  patchLocal({ courseBankShares: m.courseBankShares + 1 });
}

export function recordAiGeneration(count = 1) {
  const m = loadLocal();
  patchLocal({ aiGenerations: m.aiGenerations + count });
}

export function recordTutorChat() {
  const m = loadLocal();
  patchLocal({ tutorChats: m.tutorChats + 1 });
}

export function recordPerfectDeckReview() {
  patchLocal({ perfectDeckReview: true });
}

export function recordModuleMastered() {
  patchLocal({ moduleMastered: true });
}

export function recordRainyStudy() {
  patchLocal({ rainyStudy: true });
}

export function recordHubStudyMinutes(mins: number) {
  if (mins <= 0) return;
  const m = loadLocal();
  patchLocal({ hubStudyMinutes: m.hubStudyMinutes + mins });
}

export async function collectStudyMetrics(opts?: {
  xp?: number;
  streakDays?: number;
}): Promise<StudyMetrics> {
  const local = loadLocal();
  let codeChallenges = local.codeChallenges;
  let courseBankShares = local.courseBankShares;
  let fsrsReviews = local.fsrsReviews;
  let flashcardTouches = local.flashcardTouches;
  let moduleCount = 0;
  let hasIcal = Boolean(peekSavedCalendarUrl());
  let streakDays = opts?.streakDays ?? 0;
  let xp = opts?.xp ?? 0;

  if (!IS_DEMO) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const [mods, codes, shares, reviews, streak, cards] = await Promise.all([
          supabase.from('modules').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('code_exams').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase
            .from('shared_resources')
            .select('id', { count: 'exact', head: true })
            .eq('owner_id', user.id)
            .eq('visibility', 'course_bank'),
          supabase
            .from('card_reviews')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase.from('user_streaks').select('xp, current_streak').eq('user_id', user.id).maybeSingle(),
          supabase.from('flashcards').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        ]);
        moduleCount = mods.count || 0;
        codeChallenges = Math.max(codeChallenges, codes.count || 0);
        courseBankShares = Math.max(courseBankShares, shares.count || 0);
        fsrsReviews = Math.max(fsrsReviews, reviews.count || 0);
        flashcardTouches = Math.max(flashcardTouches, cards.count || 0, reviews.count || 0);
        if (streak.data) {
          xp = Number(streak.data.xp) || xp;
          streakDays = Number(streak.data.current_streak) || streakDays;
        }
      }
    } catch {
      /* soft */
    }
  } else {
    moduleCount = 2;
    hasIcal = true;
    streakDays = streakDays || 3;
    xp = xp || 120;
  }

  return {
    level: levelFromXp(xp),
    codeChallenges,
    nightSessions: local.nightSessions,
    pomodoroMinutes: local.pomodoroMinutes,
    streakDays,
    mockExamStreak95: local.mockExamStreak95,
    courseBankShares,
    hasIcal,
    moduleCount,
    fsrsReviews,
    studySessions: local.studySessions,
    hardMockPerfect: local.hardMockPerfect,
    graveyardSessions: local.graveyardSessions,
    moduleMastered: local.moduleMastered,
    perfectDeckReview: local.perfectDeckReview,
    mobileStudyMinutes: local.mobileStudyMinutes,
    sundayStudy: local.sundayStudy,
    rainyStudy: local.rainyStudy,
    aiGenerations: local.aiGenerations,
    flashcardTouches,
    weekendStreak3: local.weekendStreak3,
    tutorChats: local.tutorChats,
    hubStudyMinutes: local.hubStudyMinutes,
  };
}

export function mergeGrantedRewards(existing: string[], newlyUnlocked: ImmersiveThemeDef[]): string[] {
  const set = new Set(existing.map(String));
  for (const t of newlyUnlocked) set.add(t.reward);
  return [...set];
}

export function discoverNewThemeUnlocks(rewards: string[], metrics: StudyMetrics): ImmersiveThemeDef[] {
  const set = new Set(rewards.map(String));
  return IMMERSIVE_THEMES.filter((t) => {
    if (t.defaultUnlocked) return false;
    if (set.has(t.reward) || set.has(t.id) || set.has(t.accentKey)) return false;
    return isThemeUnlockedByMetrics(t, metrics);
  });
}

export function readLocalRewards(): string[] {
  try {
    const raw = localStorage.getItem(REWARDS_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p.map(String) : [];
  } catch {
    return [];
  }
}

export function writeLocalRewards(rewards: string[]) {
  try {
    localStorage.setItem(REWARDS_KEY, JSON.stringify(rewards));
  } catch {
    /* ignore */
  }
}

/** Evaluate + persist newly unlocked immersive themes; returns newly unlocked. */
export async function evaluateAndGrantThemeUnlocks(opts?: {
  xp?: number;
  streakDays?: number;
}): Promise<ImmersiveThemeDef[]> {
  const rewards = readLocalRewards();
  const metrics = await collectStudyMetrics(opts);
  const discovered = discoverNewThemeUnlocks(rewards, metrics);
  if (discovered.length) {
    writeLocalRewards(mergeGrantedRewards(rewards, discovered));
  }
  return discovered;
}
