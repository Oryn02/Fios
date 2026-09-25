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
} from '../types/db';

export const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

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
  full_name: 'Oryn Delacroix',
  preferred_name: 'Oryn',
  address: 'Galway, Ireland',
  pomodoro_work_duration: 25,
  pomodoro_short_break: 5,
  pomodoro_long_break: 15,
};

export const demoModules: DBModule[] = [
  { id: 'm1', user_id: DEMO_USER.id, code: 'SOFT06001', name: 'Software Engineering', color: 'emerald', created_at: new Date().toISOString() },
  { id: 'm2', user_id: DEMO_USER.id, code: 'COMP07020', name: 'Data Structures & Algorithms', color: 'cyan', created_at: new Date().toISOString() },
  { id: 'm3', user_id: DEMO_USER.id, code: 'DBMS06110', name: 'Database Systems', color: 'indigo', created_at: new Date().toISOString() },
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
  { id: 't1', title: 'Submit Software Quality & Testing repeat documentation', due_date: 'Tomorrow', completed: false, module_code: 'SOFT06001' },
  { id: 't2', title: 'Review Systems Analysis lecture slides', due_date: 'In 3 days', completed: false, module_code: 'SOFT06001' },
  { id: 't3', title: 'Implement AVL tree rotations', due_date: 'Friday', completed: true, module_code: 'COMP07020' },
];
