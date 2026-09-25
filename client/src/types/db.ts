// Shared database entity types matching the Supabase schema in supabase/schema.sql

export interface UserProfile {
  id: string;
  full_name: string | null;
  preferred_name: string | null;
  address: string | null;
  pomodoro_work_duration: number;
  pomodoro_short_break: number;
  pomodoro_long_break: number;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_POMODORO = {
  work: 25,
  shortBreak: 5,
  longBreak: 15,
} as const;

export interface DBModule {
  id: string;
  user_id: string;
  code: string;
  name: string;
  color: string;
  created_at: string;
}

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
  created_at?: string;
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
  due_date?: string | null;
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
