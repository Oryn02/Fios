/**
 * Immersive Roguelike theme tree — milestone unlocks (not skill points).
 * Registry drives Settings, Player Profile teases, motion layers, and operator grant UI.
 */
import type { AccentDef, AccentKey } from '../types/db';

export type ImmersiveThemeId =
  | 'bleu-minimal'
  | 'terminal-matrix'
  | 'night-shift'
  | 'cyber'
  | 'dark-matter'
  | 'manga-eclipse'
  | 'cyber-samurai'
  | 'liquid-frost'
  | 'abyssal-ocean'
  | 'synthwave'
  | 'solar-flare'
  | 'noir'
  | 'bio-punk'
  | 'elden'
  | 'badlands'
  | 'lofi-cafe'
  | 'quantum-glitch'
  | 'chibi-manga'
  | 'sakura-cafe'
  | 'webtoon-romance'
  | 'cozy-cottage';

export type UnlockMetricKey =
  | 'level'
  | 'codeChallenges'
  | 'nightSessions'
  | 'pomodoroMinutes'
  | 'streakDays'
  | 'mockExamStreak95'
  | 'courseBankShares'
  | 'hasIcal'
  | 'moduleCount'
  | 'fsrsReviews'
  | 'studySessions'
  | 'hardMockPerfect'
  | 'graveyardSessions'
  | 'moduleMastered'
  | 'perfectDeckReview'
  | 'mobileStudyMinutes'
  | 'sundayStudy'
  | 'rainyStudy'
  | 'aiGenerations'
  | 'flashcardTouches'
  | 'weekendStreak3'
  | 'tutorChats'
  | 'hubStudyMinutes';

export type UnlockRule =
  | { kind: 'or'; rules: UnlockRule[] }
  | { kind: 'and'; rules: UnlockRule[] }
  | { kind: 'gte'; metric: UnlockMetricKey; value: number }
  | { kind: 'truthy'; metric: UnlockMetricKey };

export type ThemeMotion =
  | 'aurora'
  | 'matrix'
  | 'bokeh'
  | 'grid'
  | 'accretion'
  | 'eclipse'
  | 'sakura'
  | 'frost'
  | 'ocean'
  | 'synthwave'
  | 'solar'
  | 'noir'
  | 'biopunk'
  | 'elden'
  | 'badlands'
  | 'lofi'
  | 'glitch'
  | 'chibi'
  | 'sakura-cafe'
  | 'webtoon'
  | 'hearth';

export type ImmersiveThemeDef = {
  id: ImmersiveThemeId;
  /** Accent key applied when theme is selected (maps into ACCENTS). */
  accentKey: AccentKey;
  reward: string;
  label: string;
  tagline: string;
  unlockHint: string;
  unlock: UnlockRule;
  defaultUnlocked?: boolean;
  motion: ThemeMotion;
  palette: {
    bg: string;
    surface: string;
    surface2: string;
    text: string;
    muted: string;
    border: string;
    from: string;
    via: string;
    to: string;
    solid: string;
  };
};

/** Full immersive tree — order = display order in Profile / operator panel. */
export const IMMERSIVE_THEMES: ImmersiveThemeDef[] = [
  {
    id: 'bleu-minimal',
    accentKey: 'bleu-minimal',
    reward: 'theme:bleu-minimal',
    label: 'Bleu Minimal',
    tagline: 'Liquid-glass aurora on navy slate',
    unlockHint: 'Default starter theme',
    unlock: { kind: 'truthy', metric: 'hasIcal' },
    defaultUnlocked: true,
    motion: 'aurora',
    palette: {
      bg: '#0F172A',
      surface: '#1e293b',
      surface2: '#162032',
      text: '#e2e8f0',
      muted: '#94a3b8',
      border: 'rgba(148,163,184,0.22)',
      from: '#34d399',
      via: '#2dd4bf',
      to: '#14b8a6',
      solid: '#34d399',
    },
  },
  {
    id: 'terminal-matrix',
    accentKey: 'terminal-matrix',
    reward: 'theme:terminal-matrix',
    label: 'Terminal Matrix',
    tagline: 'Cascading green rain behind frosted cards',
    unlockHint: 'Reach Level 5 or complete 50 Code Lab challenges',
    unlock: {
      kind: 'or',
      rules: [
        { kind: 'gte', metric: 'level', value: 5 },
        { kind: 'gte', metric: 'codeChallenges', value: 50 },
      ],
    },
    motion: 'matrix',
    palette: {
      bg: '#020617',
      surface: '#052e16',
      surface2: '#031a0c',
      text: '#bbf7d0',
      muted: '#4ade80',
      border: 'rgba(74,222,128,0.28)',
      from: '#86efac',
      via: '#22c55e',
      to: '#166534',
      solid: '#4ade80',
    },
  },
  {
    id: 'night-shift',
    accentKey: 'night-shift',
    reward: 'theme:night-shift',
    label: 'Seven Bar Night Shift',
    tagline: 'Amber light leaks + cocktail bokeh',
    unlockHint: 'Complete 15 study sessions after 10:00 PM',
    unlock: { kind: 'gte', metric: 'nightSessions', value: 15 },
    motion: 'bokeh',
    palette: {
      bg: '#1c1410',
      surface: '#2a1f18',
      surface2: '#1a120e',
      text: '#ffedd5',
      muted: '#fdba74',
      border: 'rgba(251,146,60,0.28)',
      from: '#fde68a',
      via: '#fbbf24',
      to: '#ea580c',
      solid: '#fbbf24',
    },
  },
  {
    id: 'cyber',
    accentKey: 'cyber',
    reward: 'theme:cyber',
    label: 'Cyber Grid',
    tagline: 'Perspective grid + neon horizon + scanline',
    unlockHint: 'Log 20 hours on the Focus Timer / Pomodoro',
    unlock: { kind: 'gte', metric: 'pomodoroMinutes', value: 20 * 60 },
    motion: 'grid',
    palette: {
      bg: '#020617',
      surface: '#0c1929',
      surface2: '#07111c',
      text: '#e0f2fe',
      muted: '#22d3ee',
      border: 'rgba(34,211,238,0.3)',
      from: '#22d3ee',
      via: '#06b6d4',
      to: '#0891b2',
      solid: '#22d3ee',
    },
  },
  {
    id: 'dark-matter',
    accentKey: 'dark-matter',
    reward: 'theme:dark-matter',
    label: 'Dark Matter',
    tagline: 'Accretion disk + violet event horizon',
    unlockHint: 'Hold a 10-day study streak',
    unlock: { kind: 'gte', metric: 'streakDays', value: 10 },
    motion: 'accretion',
    palette: {
      bg: '#030712',
      surface: '#111827',
      surface2: '#0a0f1a',
      text: '#e2e8f0',
      muted: '#a78bfa',
      border: 'rgba(139,92,246,0.32)',
      from: '#94a3b8',
      via: '#7c3aed',
      to: '#0f172a',
      solid: '#8b5cf6',
    },
  },
  {
    id: 'manga-eclipse',
    accentKey: 'manga-eclipse',
    reward: 'theme:manga-eclipse',
    label: 'Manga Berserk / Eclipse',
    tagline: 'Crimson eclipse + embers + ink vignette',
    unlockHint: 'Score 95%+ on 3 consecutive mock exams',
    unlock: { kind: 'gte', metric: 'mockExamStreak95', value: 3 },
    motion: 'eclipse',
    palette: {
      bg: '#140808',
      surface: '#1f0f0f',
      surface2: '#120808',
      text: '#fecaca',
      muted: '#f87171',
      border: 'rgba(248,113,113,0.32)',
      from: '#fb7185',
      via: '#e11d48',
      to: '#7f1d1d',
      solid: '#ef4444',
    },
  },
  {
    id: 'cyber-samurai',
    accentKey: 'cyber-samurai',
    reward: 'theme:cyber-samurai',
    label: 'Cyber-Samurai',
    tagline: 'Digital sakura + neon-pink glitch',
    unlockHint: 'Share 5 public Course Bank resources',
    unlock: { kind: 'gte', metric: 'courseBankShares', value: 5 },
    motion: 'sakura',
    palette: {
      bg: '#1a0a14',
      surface: '#2a1220',
      surface2: '#140810',
      text: '#fce7f3',
      muted: '#f9a8d4',
      border: 'rgba(244,114,182,0.32)',
      from: '#fda4af',
      via: '#ec4899',
      to: '#9d174d',
      solid: '#f472b6',
    },
  },
  {
    id: 'liquid-frost',
    accentKey: 'liquid-frost',
    reward: 'theme:liquid-frost',
    label: 'Liquid Glass / Frost',
    tagline: 'Refracting prism panes on pastel silver',
    unlockHint: 'Connect iCal and create your core module folders',
    unlock: {
      kind: 'and',
      rules: [
        { kind: 'truthy', metric: 'hasIcal' },
        { kind: 'gte', metric: 'moduleCount', value: 1 },
      ],
    },
    motion: 'frost',
    palette: {
      bg: '#0f172a',
      surface: 'rgba(30, 41, 59, 0.42)',
      surface2: 'rgba(51, 65, 85, 0.38)',
      text: '#f8fafc',
      muted: '#a5f3fc',
      border: 'rgba(165,243,252,0.28)',
      from: '#a5f3fc',
      via: '#67e8f9',
      to: '#0ea5e9',
      solid: '#22d3ee',
    },
  },
  {
    id: 'abyssal-ocean',
    accentKey: 'abyssal-ocean',
    reward: 'theme:abyssal-ocean',
    label: 'Abyssal Ocean',
    tagline: 'Pressure waves + bioluminescent bubbles',
    unlockHint: 'Complete 100 FSRS card reviews',
    unlock: { kind: 'gte', metric: 'fsrsReviews', value: 100 },
    motion: 'ocean',
    palette: {
      bg: '#020617',
      surface: '#0c1a2e',
      surface2: '#06101c',
      text: '#bae6fd',
      muted: '#38bdf8',
      border: 'rgba(56,189,248,0.3)',
      from: '#38bdf8',
      via: '#0284c7',
      to: '#0c4a6e',
      solid: '#0ea5e9',
    },
  },
  {
    id: 'synthwave',
    accentKey: 'synthwave',
    reward: 'theme:synthwave',
    label: "Synthwave / Outrun '84",
    tagline: 'Hot-pink sun, wireframe mountains, cyan horizon',
    unlockHint: 'Complete 50 study sessions or hold a 14-day streak',
    unlock: {
      kind: 'or',
      rules: [
        { kind: 'gte', metric: 'studySessions', value: 50 },
        { kind: 'gte', metric: 'streakDays', value: 14 },
      ],
    },
    motion: 'synthwave',
    palette: {
      bg: '#1a0533',
      surface: '#2d0a4e',
      surface2: '#140428',
      text: '#fce7f3',
      muted: '#22d3ee',
      border: 'rgba(236,72,153,0.35)',
      from: '#f472b6',
      via: '#ec4899',
      to: '#22d3ee',
      solid: '#f472b6',
    },
  },
  {
    id: 'solar-flare',
    accentKey: 'solar-flare',
    reward: 'theme:solar-flare',
    label: 'Solar Flare / Supernova',
    tagline: 'Plasma flares & embers in orange–sienna',
    unlockHint: 'Score 100% on a hard-tier AI Mock Exam',
    unlock: { kind: 'truthy', metric: 'hardMockPerfect' },
    motion: 'solar',
    palette: {
      bg: '#1c0a00',
      surface: '#2a1200',
      surface2: '#140800',
      text: '#ffedd5',
      muted: '#fb923c',
      border: 'rgba(249,115,22,0.35)',
      from: '#fde68a',
      via: '#f97316',
      to: '#9a3412',
      solid: '#f97316',
    },
  },
  {
    id: 'noir',
    accentKey: 'noir',
    reward: 'theme:noir',
    label: 'Monochrome Noir / Chiaroscuro',
    tagline: 'Film grain + Venetian blind shadows',
    unlockHint: 'Complete 200 FSRS card reviews',
    unlock: { kind: 'gte', metric: 'fsrsReviews', value: 200 },
    motion: 'noir',
    palette: {
      bg: '#0a0a0a',
      surface: '#171717',
      surface2: '#0f0f0f',
      text: '#f5f5f5',
      muted: '#a3a3a3',
      border: 'rgba(255,255,255,0.18)',
      from: '#e5e5e5',
      via: '#a3a3a3',
      to: '#525252',
      solid: '#d4d4d4',
    },
  },
  {
    id: 'bio-punk',
    accentKey: 'bio-punk',
    reward: 'theme:bio-punk',
    label: 'Bio-Punk / Acid Rain',
    tagline: 'Concrete slate + angled acid neon rain',
    unlockHint: 'Complete a study session between 02:00–05:00',
    unlock: { kind: 'truthy', metric: 'graveyardSessions' },
    motion: 'biopunk',
    palette: {
      bg: '#111827',
      surface: '#1f2937',
      surface2: '#0f172a',
      text: '#ecfccb',
      muted: '#a3e635',
      border: 'rgba(163,230,53,0.32)',
      from: '#bef264',
      via: '#84cc16',
      to: '#365314',
      solid: '#a3e635',
    },
  },
  {
    id: 'elden',
    accentKey: 'elden',
    reward: 'theme:elden',
    label: 'Elden / Erdtree',
    tagline: 'Golden ash motes on charcoal stone',
    unlockHint: 'Master all cards in a module and ace an entire deck review',
    unlock: {
      kind: 'and',
      rules: [
        { kind: 'truthy', metric: 'moduleMastered' },
        { kind: 'truthy', metric: 'perfectDeckReview' },
      ],
    },
    motion: 'elden',
    palette: {
      bg: '#1c1917',
      surface: '#292524',
      surface2: '#1a1614',
      text: '#fef3c7',
      muted: '#fbbf24',
      border: 'rgba(251,191,36,0.3)',
      from: '#fde68a',
      via: '#d97706',
      to: '#78350f',
      solid: '#f59e0b',
    },
  },
  {
    id: 'badlands',
    accentKey: 'badlands',
    reward: 'theme:badlands',
    label: 'Cyberpunk Nomad / Badlands',
    tagline: 'Sand-dust drift + heat shimmer on rust',
    unlockHint: 'Study 10 hours on mobile / on-the-go',
    unlock: { kind: 'gte', metric: 'mobileStudyMinutes', value: 10 * 60 },
    motion: 'badlands',
    palette: {
      bg: '#1c1008',
      surface: '#2a1810',
      surface2: '#140c08',
      text: '#ffedd5',
      muted: '#ea580c',
      border: 'rgba(194,65,12,0.35)',
      from: '#fdba74',
      via: '#c2410c',
      to: '#7c2d12',
      solid: '#ea580c',
    },
  },
  {
    id: 'lofi-cafe',
    accentKey: 'lofi-cafe',
    reward: 'theme:lofi-cafe',
    label: 'Lo-Fi Cafe / Rainy Window',
    tagline: 'Rain on frosted pane + amber bleed + steam',
    unlockHint: 'Study on Sunday, a rainy day, or hold a 5-day streak',
    unlock: {
      kind: 'or',
      rules: [
        { kind: 'truthy', metric: 'sundayStudy' },
        { kind: 'truthy', metric: 'rainyStudy' },
        { kind: 'gte', metric: 'streakDays', value: 5 },
      ],
    },
    motion: 'lofi',
    palette: {
      bg: '#1a1410',
      surface: '#2a221c',
      surface2: '#161210',
      text: '#fef3c7',
      muted: '#d6d3d1',
      border: 'rgba(217,119,6,0.28)',
      from: '#fcd34d',
      via: '#d97706',
      to: '#78716c',
      solid: '#d97706',
    },
  },
  {
    id: 'quantum-glitch',
    accentKey: 'quantum-glitch',
    reward: 'theme:quantum-glitch',
    label: 'Quantum Glitch / Datamosh',
    tagline: 'Chromatic aberration + RGB-split flashes',
    unlockHint: 'Run 100 AI Studio generations (notes, code, or quizzes)',
    unlock: { kind: 'gte', metric: 'aiGenerations', value: 100 },
    motion: 'glitch',
    palette: {
      bg: '#0a0a12',
      surface: '#12121f',
      surface2: '#080810',
      text: '#f8fafc',
      muted: '#a78bfa',
      border: 'rgba(244,63,94,0.35)',
      from: '#22d3ee',
      via: '#f43f5e',
      to: '#a855f7',
      solid: '#f43f5e',
    },
  },
  {
    id: 'chibi-manga',
    accentKey: 'chibi-manga',
    reward: 'theme:chibi-manga',
    label: 'Chibi Manga / Panel Sketch',
    tagline: 'Screentone, speed lines, ink-wash panels',
    unlockHint: 'Read or generate 100 flashcards (manga/lit modules or any cards)',
    unlock: { kind: 'gte', metric: 'flashcardTouches', value: 100 },
    motion: 'chibi',
    palette: {
      bg: '#1c1917',
      surface: '#292524',
      surface2: '#44403c',
      text: '#fafaf9',
      muted: '#fca5a5',
      border: 'rgba(68,64,60,0.45)',
      from: '#fca5a5',
      via: '#f87171',
      to: '#44403c',
      solid: '#f87171',
    },
  },
  {
    id: 'sakura-cafe',
    accentKey: 'sakura-cafe',
    reward: 'theme:sakura-cafe',
    label: 'Sakura Blossom Cafe',
    tagline: 'Drifting blossoms on pastel pink + morning sun',
    unlockHint: 'Hold a 3-day streak that spans a weekend',
    unlock: { kind: 'truthy', metric: 'weekendStreak3' },
    motion: 'sakura-cafe',
    palette: {
      bg: '#fff1f2',
      surface: '#ffe4e6',
      surface2: '#fdf2f8',
      text: '#881337',
      muted: '#fb7185',
      border: 'rgba(251,113,133,0.28)',
      from: '#fbcfe8',
      via: '#f9a8d4',
      to: '#fda4af',
      solid: '#f9a8d4',
    },
  },
  {
    id: 'webtoon-romance',
    accentKey: 'webtoon-romance',
    reward: 'theme:webtoon-romance',
    label: 'Midnight Webtoon / Neon Romance',
    tagline: 'Lavender↔peach gradient + heart/star sparkles',
    unlockHint: 'Use AI Tutor / Chat 25 times',
    unlock: { kind: 'gte', metric: 'tutorChats', value: 25 },
    motion: 'webtoon',
    palette: {
      bg: '#1e1033',
      surface: '#2a1848',
      surface2: '#3b1d5c',
      text: '#fdf4ff',
      muted: '#f9a8d4',
      border: 'rgba(196,181,253,0.35)',
      from: '#c4b5fd',
      via: '#f9a8d4',
      to: '#fdba74',
      solid: '#c4b5fd',
    },
  },
  {
    id: 'cozy-cottage',
    accentKey: 'cozy-cottage',
    reward: 'theme:cozy-cottage',
    label: 'Cozy Cottage / Hearthside',
    tagline: 'Hearth flicker on beige wood + ember fireflies',
    unlockHint: 'Log 5 hours of focus / Overview & Agenda study time',
    unlock: { kind: 'gte', metric: 'hubStudyMinutes', value: 5 * 60 },
    motion: 'hearth',
    palette: {
      bg: '#292524',
      surface: '#44403c',
      surface2: '#57534e',
      text: '#fef3c7',
      muted: '#d6d3d1',
      border: 'rgba(217,119,6,0.3)',
      from: '#fde68a',
      via: '#d6d3d1',
      to: '#a8a29e',
      solid: '#d97706',
    },
  },
];

export type StudyMetrics = Partial<Record<UnlockMetricKey, number | boolean>>;

export function evalUnlockRule(rule: UnlockRule, m: StudyMetrics): boolean {
  switch (rule.kind) {
    case 'or':
      return rule.rules.some((r) => evalUnlockRule(r, m));
    case 'and':
      return rule.rules.every((r) => evalUnlockRule(r, m));
    case 'gte': {
      const v = Number(m[rule.metric] ?? 0);
      return v >= rule.value;
    }
    case 'truthy':
      return Boolean(m[rule.metric]);
    default:
      return false;
  }
}

export function isThemeUnlockedByMetrics(theme: ImmersiveThemeDef, m: StudyMetrics): boolean {
  if (theme.defaultUnlocked) return true;
  return evalUnlockRule(theme.unlock, m);
}

export function listImmersiveThemes(): ImmersiveThemeDef[] {
  return IMMERSIVE_THEMES;
}

export function getImmersiveTheme(id: string | null | undefined): ImmersiveThemeDef | null {
  if (!id) return null;
  return (
    IMMERSIVE_THEMES.find(
      (t) => t.id === id || t.reward === id || t.reward === `theme:${id}` || t.accentKey === id
    ) || null
  );
}

export function getImmersiveByAccent(key: AccentKey): ImmersiveThemeDef | null {
  return IMMERSIVE_THEMES.find((t) => t.accentKey === key) || null;
}

/** Next locked theme tease for Player Card / Profile. */
export function nextImmersiveTease(
  unlockedRewards: string[],
  metrics: StudyMetrics
): { theme: ImmersiveThemeDef; hint: string; ready: boolean } | null {
  const set = new Set(unlockedRewards.map(String));
  for (const t of IMMERSIVE_THEMES) {
    if (t.defaultUnlocked) continue;
    if (set.has(t.reward) || set.has(t.id) || set.has(t.accentKey)) continue;
    const ready = isThemeUnlockedByMetrics(t, metrics);
    return { theme: t, hint: ready ? `Ready to unlock ${t.label}` : t.unlockHint, ready };
  }
  return null;
}

/** Bridge for legacy RpgThemeUnlock consumers (operator panel / Settings). */
export type RpgThemeUnlock = {
  key: AccentKey;
  reward: string;
  label: string;
  /** Always 0 — immersive themes unlock via study milestones, not SP. */
  spCost: number;
  accent: AccentDef;
  immersiveId: ImmersiveThemeId;
  unlockHint: string;
};

export function listRpgThemeUnlocks(): RpgThemeUnlock[] {
  return IMMERSIVE_THEMES.filter((t) => !t.defaultUnlocked).map((t) => ({
    key: t.accentKey,
    reward: t.reward,
    label: t.label,
    spCost: 0,
    immersiveId: t.id,
    unlockHint: t.unlockHint,
    accent: {
      key: t.accentKey,
      label: t.label,
      from: t.palette.from,
      via: t.palette.via,
      to: t.palette.to,
      solid: t.palette.solid,
    },
  }));
}

export function rpgRewardForAccent(key: AccentKey): string {
  const hit = IMMERSIVE_THEMES.find((t) => t.accentKey === key && !t.defaultUnlocked);
  return hit?.reward || `theme:${key}`;
}

export function accentKeyFromReward(reward: string): AccentKey | null {
  const t = getImmersiveTheme(reward);
  return t && !t.defaultUnlocked ? t.accentKey : null;
}

export function rewardsIncludeTheme(rewards: string[], key: AccentKey | ImmersiveThemeId): boolean {
  const set = new Set(rewards.map(String));
  if (set.has(`theme:${key}`) || set.has(key)) return true;
  const byAccent = IMMERSIVE_THEMES.find((t) => t.accentKey === key || t.id === key);
  if (!byAccent) return false;
  return set.has(byAccent.reward) || set.has(byAccent.id) || set.has(byAccent.accentKey);
}

export function applyImmersivePalette(theme: ImmersiveThemeDef | null): void {
  const root = document.documentElement;
  if (!theme || theme.defaultUnlocked) {
    root.removeAttribute('data-rpg-theme');
    root.style.removeProperty('--rpg-bg');
    root.style.removeProperty('--rpg-surface');
    root.style.removeProperty('--rpg-surface-2');
    root.style.removeProperty('--rpg-text');
    root.style.removeProperty('--rpg-muted');
    root.style.removeProperty('--rpg-border');
    root.style.removeProperty('--background');
    root.style.removeProperty('--card');
    root.style.removeProperty('--foreground');
    root.style.removeProperty('--muted-foreground');
    root.style.removeProperty('--border');
    root.style.removeProperty('--fios-surface-2');
    return;
  }
  root.setAttribute('data-rpg-theme', theme.id);
  root.style.setProperty('--rpg-bg', theme.palette.bg);
  root.style.setProperty('--rpg-surface', theme.palette.surface);
  root.style.setProperty('--rpg-surface-2', theme.palette.surface2);
  root.style.setProperty('--rpg-text', theme.palette.text);
  root.style.setProperty('--rpg-muted', theme.palette.muted);
  root.style.setProperty('--rpg-border', theme.palette.border);
  root.style.setProperty('--fios-accent-from', theme.palette.from);
  root.style.setProperty('--fios-accent-via', theme.palette.via);
  root.style.setProperty('--fios-accent-to', theme.palette.to);
  root.style.setProperty('--fios-accent-solid', theme.palette.solid);
  root.style.setProperty('--fios-bg', theme.palette.bg);
  root.style.setProperty('--fios-surface', theme.palette.surface);
  root.style.setProperty('--fios-surface-2', theme.palette.surface2);
  root.style.setProperty('--fios-text', theme.palette.text);
  root.style.setProperty('--fios-text-muted', theme.palette.muted);
  // Keep shadcn `bg-card` / `text-foreground` grids in sync with immersive palette
  root.style.setProperty('--background', theme.palette.bg);
  root.style.setProperty('--card', theme.palette.surface);
  root.style.setProperty('--foreground', theme.palette.text);
  root.style.setProperty('--muted-foreground', theme.palette.muted);
  root.style.setProperty('--border', theme.palette.border);
}
