// ============================================================================
// Demo mode — env-gated (VITE_DEMO_MODE="true"), OFF by default.
//
// When enabled, the app bypasses Supabase auth with a fake session and serves
// in-memory sample data. This makes it possible to preview and screenshot the
// authenticated dashboard without a live Supabase project / confirmed login.
// Production builds leave this disabled and use the real Supabase backend.
// ============================================================================
import type {
  UserProfile,
  DBModule,
  Deck,
  MCQQuiz,
  CodeExam,
  Task,
  FiosDocument,
  Grade,
  FocusSession,
} from '../types/db';

function demoFlagFromSession(): boolean {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem('fios_demo') === '1';
  } catch {
    return false;
  }
}

// Demo mode is enabled either at build time (VITE_DEMO_MODE) or at runtime via
// the landing page's "Explore Live Demo" button (session-scoped).
export const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true' || demoFlagFromSession();

export function enableDemoAndReload(): void {
  try { sessionStorage.setItem('fios_demo', '1'); } catch { /* ignore */ }
  window.location.reload();
}

export function disableDemo(): void {
  try { sessionStorage.removeItem('fios_demo'); } catch { /* ignore */ }
}

export const DEMO_USER = {
  id: 'demo-user-0001',
  email: 'demo@fios.app',
};

export const DEMO_SESSION = {
  user: DEMO_USER,
  access_token: 'demo-token',
} as const;

export const demoProfile: UserProfile = {
  id: DEMO_USER.id,
  full_name: 'Demo Student',
  preferred_name: 'Student',
  address: 'University Campus, Ireland',
  avatar_url: null,
  accent_color: 'emerald',
  theme: 'dark',
  gemini_api_key: 'demo-key-configured',
  weekly_study_goal_hours: 10,
  pomodoro_work_duration: 25,
  pomodoro_short_break: 5,
  pomodoro_long_break: 15,
};

function daysFromNow(d: number): string {
  return new Date(Date.now() + d * 86400_000).toISOString().slice(0, 10);
}

export const demoModules: DBModule[] = [
  { id: 'm1', user_id: DEMO_USER.id, code: 'SOFT06001', name: 'Software Engineering', color: 'emerald', exam_date: daysFromNow(6), created_at: new Date().toISOString() },
  { id: 'm2', user_id: DEMO_USER.id, code: 'COMP07020', name: 'Data Structures & Algorithms', color: 'cyan', exam_date: daysFromNow(14), created_at: new Date().toISOString() },
  { id: 'm3', user_id: DEMO_USER.id, code: 'DBMS06110', name: 'Database Systems', color: 'indigo', exam_date: null, created_at: new Date().toISOString() },
];

export const demoDecks: Deck[] = [
  {
    id: 'd1', user_id: DEMO_USER.id, title: 'SDLC Models & Agile', module_code: 'SOFT06001',
    created_at: new Date().toISOString(),
    cards: [
      { id: 'c1', front: 'What is the Waterfall model?', back: 'A linear, sequential SDLC where each phase must complete before the next begins.' },
      { id: 'c2', front: 'Name a core Agile value.', back: 'Responding to change over following a plan.' },
    ],
  },
  {
    id: 'd2', user_id: DEMO_USER.id, title: 'Big-O Essentials', module_code: 'COMP07020',
    created_at: new Date().toISOString(),
    cards: [
      { id: 'c3', front: 'Time complexity of binary search?', back: 'O(log n)' },
      { id: 'c4', front: 'Time complexity of hash lookup (avg)?', back: 'O(1)' },
    ],
  },
];

export const demoQuizzes: MCQQuiz[] = [
  {
    id: 'q1', user_id: DEMO_USER.id, module_code: 'COMP07020', title: 'Sorting Algorithms Quiz',
    created_at: new Date().toISOString(),
    questions: [
      { id: 'qq1', question: 'Which sort is stable and O(n log n)?', options: ['Quicksort', 'Merge sort', 'Selection sort', 'Bubble sort'], correctIndex: 1, explanation: 'Merge sort is stable and runs in O(n log n).' },
    ],
  },
];

export const demoCodeExams: CodeExam[] = [
  {
    id: 'ce1', user_id: DEMO_USER.id, module_code: 'SOFT06001', title: 'Fix the off-by-one loop',
    language: 'javascript', exam_type: 'bug_fix',
    prompt: 'The function should sum an array but misses the last element. Fix the bug.',
    starter_code: 'function sum(a){let s=0;for(let i=0;i<a.length-1;i++){s+=a[i]}return s}',
    solution_code: 'function sum(a){let s=0;for(let i=0;i<a.length;i++){s+=a[i]}return s}',
    completed: true,
    created_at: new Date().toISOString(),
  },
];

export const demoTasks: Task[] = [
  { id: 't1', title: 'Submit Software Quality & Testing documentation', due_date: 'Tomorrow', completed: false, module_code: 'SOFT06001' },
  { id: 't2', title: 'Review Systems Analysis lecture slides', due_date: 'In 3 days', completed: false, module_code: 'SOFT06001' },
  { id: 't3', title: 'Implement AVL tree rotations', due_date: 'Friday', completed: true, module_code: 'COMP07020' },
];

export const demoDocuments: FiosDocument[] = [
  {
    id: 'doc1', user_id: DEMO_USER.id, module_code: 'SOFT06001', title: 'Agile Methodologies — Lecture 4',
    content: 'Agile is an iterative approach to software delivery that builds software incrementally...',
    summary: 'Agile favours iterative delivery, customer collaboration, and responding to change. Scrum and Kanban are common frameworks; sprints deliver working increments with continuous feedback.',
    glossary: [
      { term: 'Sprint', definition: 'A fixed-length iteration (usually 1–4 weeks) that delivers a working increment.' },
      { term: 'Backlog', definition: 'An ordered list of everything that might be needed in the product.' },
    ],
    created_at: new Date().toISOString(),
  },
];

export const demoGrades: Grade[] = [
  { id: 'g1', user_id: DEMO_USER.id, module_code: 'SOFT06001', title: 'CA 1 — Requirements Doc', weight: 20, score: 72, target_grade: 60, created_at: new Date().toISOString() },
  { id: 'g2', user_id: DEMO_USER.id, module_code: 'SOFT06001', title: 'CA 3 — Sprint Demo', weight: 30, score: null, target_grade: 60, created_at: new Date().toISOString() },
  { id: 'g3', user_id: DEMO_USER.id, module_code: 'SOFT06001', title: 'Final Exam', weight: 50, score: null, target_grade: 60, created_at: new Date().toISOString() },
];

function hoursAgo(h: number) { return new Date(Date.now() - h * 3600_000).toISOString(); }

export const demoFocusSessions: FocusSession[] = [
  { id: 'f1', user_id: DEMO_USER.id, minutes: 25, mode: 'work', created_at: hoursAgo(2) },
  { id: 'f2', user_id: DEMO_USER.id, minutes: 25, mode: 'work', created_at: hoursAgo(6) },
  { id: 'f3', user_id: DEMO_USER.id, minutes: 50, mode: 'work', created_at: hoursAgo(26) },
  { id: 'f4', user_id: DEMO_USER.id, minutes: 25, mode: 'work', created_at: hoursAgo(50) },
];