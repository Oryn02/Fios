/** Shared RPG / streak math — mirrors server/src/routes/rpg.ts */

export function levelFromXp(xp: number): number {
  const safe = Math.max(0, Number(xp) || 0);
  return 1 + Math.floor(Math.sqrt(safe / 50));
}

/** XP required to reach a given level (inverse of levelFromXp). */
export function xpForLevel(level: number): number {
  const lv = Math.max(1, Math.floor(level));
  if (lv <= 1) return 0;
  return Math.ceil(50 * (lv - 1) ** 2);
}

export function xpProgress(xp: number): {
  level: number;
  xp: number;
  intoLevel: number;
  needForNext: number;
  pct: number;
} {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  const intoLevel = Math.max(0, xp - floor);
  const needForNext = Math.max(1, ceil - floor);
  return {
    level,
    xp,
    intoLevel,
    needForNext,
    pct: Math.min(100, Math.round((intoLevel / needForNext) * 100)),
  };
}

import { listRpgThemeUnlocks, nextImmersiveTease, rewardsIncludeTheme } from './rpgThemeRegistry';
import type { StudyMetrics } from './rpgThemeRegistry';

export type RewardTease = { label: string; remainingXp: number; remainingSp?: number; hint?: string };

/**
 * Tease the next unlock — immersive study milestones first, else next XP level.
 */
export function nextRewardTease(
  xp: number,
  skillPoints: number,
  unlockedRewards: string[],
  metrics?: StudyMetrics
): RewardTease {
  const rewards = unlockedRewards.map(String);
  const immersive = nextImmersiveTease(rewards, metrics || {});
  if (immersive) {
    return {
      label: immersive.theme.label,
      remainingXp: immersive.ready ? 0 : 1,
      remainingSp: 0,
      hint: immersive.hint,
    };
  }
  for (const t of listRpgThemeUnlocks()) {
    if (rewardsIncludeTheme(rewards, t.key)) continue;
    return { label: t.label, remainingXp: 1, remainingSp: 0, hint: t.unlockHint };
  }
  const { needForNext, intoLevel } = xpProgress(xp);
  return {
    label: `Level ${levelFromXp(xp) + 1}`,
    remainingXp: Math.max(0, needForNext - intoLevel),
  };
}

/** Demo / session XP for loot tallies when server doesn't return a breakdown. */
export function estimateStudyLoot(opts: {
  cardsReviewed?: number;
  codePassed?: boolean;
  streakBonus?: boolean;
}): { cardXp: number; streakXp: number; codeXp: number; total: number } {
  const cards = Math.max(0, opts.cardsReviewed ?? 0);
  const cardXp = cards * 8;
  const streakXp = opts.streakBonus ? 15 : 0;
  const codeXp = opts.codePassed ? 25 : 0;
  return { cardXp, streakXp, codeXp, total: cardXp + streakXp + codeXp };
}
