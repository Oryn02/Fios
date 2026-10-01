// Shared database entity types matching the Supabase schema in supabase/schema.sql

export type AccentKey =
  | 'emerald'
  | 'ocean'
  | 'sunset'
  | 'lime'
  | 'copper'
  | 'aurora'
  | 'glacier'
  | 'ember'
  | 'violet'
  | 'deep-emerald'
  | 'vibrant-indigo'
  | 'sunset-amber'
  | 'slate-teal'
  | 'rose-quartz'
  | 'neon-violet'
  | 'cyber'
  | 'dark-matter'
  /** Immersive Roguelike themes (v4.1+) — unlocked via study milestones. */
  | 'bleu-minimal'
  | 'terminal-matrix'
  | 'night-shift'
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
export type ThemeMode = 'dark' | 'light' | 'system';

export interface UserProfile {
  id: string;
  full_name: string | null;
  preferred_name: string | null;
  address: string | null;
  /** ISO date YYYY-MM-DD; only month/day drive birthday theme + greeting. */
  birthday: string | null;
  avatar_url: string | null;
  accent_color: AccentKey;
  theme: ThemeMode;
  gemini_api_key: string | null;
  weekly_study_goal_hours: number;
  pomodoro_work_duration: number;
  pomodoro_short_break: number;
  pomodoro_long_break: number;
  /** Free-form client preferences (widgets, a11y, nav slots). */
  prefs?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_POMODORO = {
  work: 25,
  shortBreak: 5,
  longBreak: 15,
} as const;

export interface AccentDef {
  key: AccentKey;
  label: string;
  from: string; // hex
  via: string;  // hex (mid stop)
  to: string;   // hex
  solid: string;
}

/**
 * User-selectable 3-stop accent gradients for the dashboard (not the locked landing brand).
 * Emerald is the Fios signature; other options stay off the purple-default AI look.
 */
export const ACCENTS: AccentDef[] = [
  { key: 'emerald', label: 'Emerald Teal', from: '#34d399', via: '#2dd4bf', to: '#14b8a6', solid: '#34d399' },
  { key: 'deep-emerald', label: 'Deep Emerald', from: '#34d399', via: '#10b981', to: '#047857', solid: '#10b981' },
  { key: 'ocean', label: 'Electric Ocean', from: '#22d3ee', via: '#38bdf8', to: '#2563eb', solid: '#38bdf8' },
  { key: 'vibrant-indigo', label: 'Vibrant Indigo', from: '#a5b4fc', via: '#818cf8', to: '#4f46e5', solid: '#818cf8' },
  { key: 'sunset', label: 'Sunset Fire', from: '#fbbf24', via: '#fb923c', to: '#f43f5e', solid: '#fb923c' },
  { key: 'sunset-amber', label: 'Sunset Amber', from: '#fde68a', via: '#fbbf24', to: '#f59e0b', solid: '#fbbf24' },
  { key: 'slate-teal', label: 'Slate Teal', from: '#5eead4', via: '#2dd4bf', to: '#0f766e', solid: '#2dd4bf' },
  { key: 'lime', label: 'Neon Lime', from: '#bef264', via: '#a3e635', to: '#22c55e', solid: '#84cc16' },
  { key: 'copper', label: 'Copper Bronze', from: '#f59e0b', via: '#d97706', to: '#b45309', solid: '#d97706' },
  { key: 'aurora', label: 'Aurora Mint', from: '#5eead4', via: '#34d399', to: '#f472b6', solid: '#2dd4bf' },
  { key: 'glacier', label: 'Glacier Ice', from: '#a5f3fc', via: '#67e8f9', to: '#0ea5e9', solid: '#22d3ee' },
  { key: 'ember', label: 'Ember Rose', from: '#fb7185', via: '#f43f5e', to: '#e11d48', solid: '#f43f5e' },
  { key: 'rose-quartz', label: 'Rose Quartz', from: '#fda4af', via: '#fb7185', to: '#e11d48', solid: '#fb7185' },
  { key: 'violet', label: 'Cyber Violet', from: '#c084fc', via: '#a78bfa', to: '#6366f1', solid: '#a78bfa' },
  { key: 'neon-violet', label: 'Neon Violet', from: '#e9d5ff', via: '#c084fc', to: '#7c3aed', solid: '#c084fc' },
  /** Immersive Roguelike themes (v4.1+) — study-milestone unlocks. */
  { key: 'bleu-minimal', label: 'Bleu Minimal', from: '#34d399', via: '#2dd4bf', to: '#14b8a6', solid: '#34d399' },
  { key: 'terminal-matrix', label: 'Terminal Matrix', from: '#86efac', via: '#22c55e', to: '#166534', solid: '#4ade80' },
  { key: 'night-shift', label: 'Seven Bar Night Shift', from: '#fde68a', via: '#fbbf24', to: '#ea580c', solid: '#fbbf24' },
  { key: 'cyber', label: 'Cyber Grid', from: '#22d3ee', via: '#06b6d4', to: '#0891b2', solid: '#22d3ee' },
  { key: 'dark-matter', label: 'Dark Matter', from: '#94a3b8', via: '#7c3aed', to: '#0f172a', solid: '#8b5cf6' },
  { key: 'manga-eclipse', label: 'Manga Berserk / Eclipse', from: '#fb7185', via: '#e11d48', to: '#7f1d1d', solid: '#ef4444' },
  { key: 'cyber-samurai', label: 'Cyber-Samurai', from: '#fda4af', via: '#ec4899', to: '#9d174d', solid: '#f472b6' },
  { key: 'liquid-frost', label: 'Liquid Glass / Frost', from: '#a5f3fc', via: '#67e8f9', to: '#0ea5e9', solid: '#22d3ee' },
  { key: 'abyssal-ocean', label: 'Abyssal Ocean', from: '#38bdf8', via: '#0284c7', to: '#0c4a6e', solid: '#0ea5e9' },
  { key: 'synthwave', label: "Synthwave / Outrun '84", from: '#f472b6', via: '#ec4899', to: '#22d3ee', solid: '#f472b6' },
  { key: 'solar-flare', label: 'Solar Flare / Supernova', from: '#fde68a', via: '#f97316', to: '#9a3412', solid: '#f97316' },
  { key: 'noir', label: 'Monochrome Noir', from: '#e5e5e5', via: '#a3a3a3', to: '#525252', solid: '#d4d4d4' },
  { key: 'bio-punk', label: 'Bio-Punk / Acid Rain', from: '#bef264', via: '#84cc16', to: '#365314', solid: '#a3e635' },
  { key: 'elden', label: 'Elden / Erdtree', from: '#fde68a', via: '#d97706', to: '#78350f', solid: '#f59e0b' },
  { key: 'badlands', label: 'Cyberpunk Nomad', from: '#fdba74', via: '#c2410c', to: '#7c2d12', solid: '#ea580c' },
  { key: 'lofi-cafe', label: 'Lo-Fi Cafe', from: '#fcd34d', via: '#d97706', to: '#78716c', solid: '#d97706' },
  { key: 'quantum-glitch', label: 'Quantum Glitch', from: '#22d3ee', via: '#f43f5e', to: '#a855f7', solid: '#f43f5e' },
  { key: 'chibi-manga', label: 'Chibi Manga', from: '#fca5a5', via: '#f87171', to: '#44403c', solid: '#f87171' },
  { key: 'sakura-cafe', label: 'Sakura Blossom Cafe', from: '#fbcfe8', via: '#f9a8d4', to: '#fda4af', solid: '#f9a8d4' },
  { key: 'webtoon-romance', label: 'Midnight Webtoon', from: '#c4b5fd', via: '#f9a8d4', to: '#fdba74', solid: '#c4b5fd' },
  { key: 'cozy-cottage', label: 'Cozy Cottage', from: '#fde68a', via: '#d6d3d1', to: '#a8a29e', solid: '#d97706' },
];

/** Accents that require an immersive study-milestone unlock before selection. */
export const LOCKED_ACCENTS = new Set<AccentKey>([
  'terminal-matrix',
  'night-shift',
  'cyber',
  'dark-matter',
  'manga-eclipse',
  'cyber-samurai',
  'liquid-frost',
  'abyssal-ocean',
  'synthwave',
  'solar-flare',
  'noir',
  'bio-punk',
  'elden',
  'badlands',
  'lofi-cafe',
  'quantum-glitch',
  'chibi-manga',
  'sakura-cafe',
  'webtoon-romance',
  'cozy-cottage',
]);

export const ACCENT_KEYS = new Set(ACCENTS.map((a) => a.key));

export function normalizeAccent(raw: string | null | undefined): AccentKey {
  if (raw && ACCENT_KEYS.has(raw as AccentKey)) return raw as AccentKey;
  return 'emerald';
}

export interface RecallConcept {
  concept: string;
  status: 'covered' | 'partial' | 'missed';
  note?: string;
}

export interface ActiveRecallLog {
  id: string;
  user_id: string;
  module_code?: string | null;
  topic: string;
  accuracy: number;
  content?: string | null;
  report: RecallConcept[];
  created_at: string;
}

export interface FiosDocument {
  id: string;
  user_id: string;
  module_code?: string | null;
  title: string;
  content: string;
  summary?: string | null;
  glossary: { term: string; definition: string }[];
  created_at: string;
}

export interface Grade {
  id: string;
  user_id: string;
  module_code?: string | null;
  title: string;
  weight: number;
  score: number | null;
  target_grade: number;
  created_at: string;
}

export interface FocusSession {
  id: string;
  user_id: string;
  minutes: number;
  mode: string;
  created_at: string;
}

export interface DBModule {
  id: string;
  user_id: string;
  code: string;
  name: string;
  color: string;
  exam_date?: string | null;
  parent_code?: string | null;
  tags?: string[] | null;
  created_at: string;
}

/** Scheduler used for spaced repetition — SM-2 default; FSRS opt-in. */
export type CardScheduler = 'sm2' | 'fsrs';

export interface Card {
  id?: string;
  deck_id?: string;
  // AI payloads use front/back; persisted rows use question/answer. Support both.
  front?: string;
  back?: string;
  question?: string;
  answer?: string;
  ease_factor?: number;
  interval?: number;
  repetitions?: number;
  next_review?: string | null;
  /** Default sm2 — existing decks keep client SM-2. */
  scheduler?: CardScheduler;
  fsrs_state?: Record<string, unknown> | null;
  created_at?: string;
  source_page?: number | null;
  source_paragraph?: number | null;
  source_quote?: string | null;
  source_document_id?: string | null;
  card_type?: 'basic' | 'code' | string;
  code_language?: string | null;
  starter_code?: string | null;
  expected_output?: string | null;
  solution_code?: string | null;
}

export interface ModuleExam {
  id: string;
  module_id: string;
  user_id: string;
  title: string;
  exam_at: string;
  weight?: number | null;
  created_at?: string;
}

export interface UserStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  xp: number;
  last_study_date: string | null;
  updated_at?: string;
  skill_points?: number;
  unlocked_rewards?: string[] | unknown;
  streak_freeze_until?: string | null;
  lobby_border?: string;
  active_theme_unlock?: string | null;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'blocked' | 'declined';
  created_at?: string;
  updated_at?: string;
}

export interface SharedResource {
  id: string;
  owner_id: string;
  resource_type: 'deck' | 'document' | 'quiz' | 'module' | 'link';
  resource_id?: string | null;
  title: string;
  module_code?: string | null;
  payload: Record<string, unknown>;
  visibility: 'private' | 'friends' | 'group' | 'course_bank';
  group_id?: string | null;
  created_at?: string;
  upvote_count?: number;
  downvote_count?: number;
  view_count?: number;
  clone_count?: number;
  user_vote?: number | null;
}

export interface Deck {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  module_code?: string | null;
  created_at: string;
  cards?: Card[];
}

export interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface MCQQuiz {
  id: string;
  user_id: string;
  module_code?: string | null;
  title: string;
  questions: MCQQuestion[];
  created_at: string;
}

export type CodeExamType = 'bug_fix' | 'output_prediction' | 'logic_completion';
export type CodeLanguage = 'javascript' | 'typescript' | 'python' | 'c';

export interface CodeExam {
  id: string;
  user_id: string;
  module_code?: string | null;
  title: string;
  language: CodeLanguage;
  exam_type: CodeExamType;
  prompt: string;
  starter_code?: string | null;
  solution_code?: string | null;
  user_code?: string | null;
  completed: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  user_id?: string;
  module_code?: string | null;
  title: string;
  /** Legacy free-text label (e.g. "Tomorrow"); kept for older rows. */
  due_date?: string | null;
  /** Specific due datetime (ISO). Preferred for agenda interleaving. */
  due_at?: string | null;
  /** Optional start datetime (ISO). Defaults to 30m before due_at in agenda. */
  start_at?: string | null;
  completed: boolean;
  created_at?: string;
}

export const CODE_LANGUAGES: { value: CodeLanguage; label: string; monaco: string }[] = [
  { value: 'javascript', label: 'JavaScript', monaco: 'javascript' },
  { value: 'typescript', label: 'TypeScript', monaco: 'typescript' },
  { value: 'python', label: 'Python', monaco: 'python' },
  { value: 'c', label: 'C', monaco: 'c' },
];

export const CODE_EXAM_TYPES: { value: CodeExamType; label: string; description: string }[] = [
  { value: 'bug_fix', label: 'Bug Fix', description: 'Find and fix the defect in the snippet.' },
  { value: 'output_prediction', label: 'Output Prediction', description: 'Predict the exact program output.' },
  { value: 'logic_completion', label: 'Logic Completion', description: 'Complete the missing logic to pass the goal.' },
];
