-- ============================================================================
-- Fios — Supabase schema
-- ============================================================================
-- Run this in the Supabase SQL editor for your project. It is idempotent and
-- safe to re-run. Every table is owned per-user and protected by Row Level
-- Security so a signed-in user can only ever read/write their own rows.
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- user_profiles: one row per auth user, holding display + Pomodoro preferences
-- ----------------------------------------------------------------------------
create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  preferred_name text,
  address text,
  avatar_url text,
  accent_color text not null default 'emerald',
  theme text not null default 'dark',
  gemini_api_key text,
  weekly_study_goal_hours integer not null default 10,
  pomodoro_work_duration integer not null default 25,
  pomodoro_short_break integer not null default 5,
  pomodoro_long_break integer not null default 15,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Additive migration for existing projects (safe to re-run).
alter table public.user_profiles add column if not exists avatar_url text;
alter table public.user_profiles add column if not exists accent_color text not null default 'emerald';
alter table public.user_profiles add column if not exists theme text not null default 'dark';
alter table public.user_profiles add column if not exists gemini_api_key text;
alter table public.user_profiles add column if not exists weekly_study_goal_hours integer not null default 10;

-- ----------------------------------------------------------------------------
-- modules: subject folders (e.g. SOFT06001 — Software Engineering)
-- ----------------------------------------------------------------------------
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null,
  name text not null,
  color text not null default 'emerald',
  exam_date date,
  created_at timestamptz not null default now()
);
create index if not exists modules_user_idx on public.modules (user_id);
alter table public.modules add column if not exists exam_date date;

-- ----------------------------------------------------------------------------
-- decks + cards (cards carry SM-2 spaced-repetition scheduling fields)
-- ----------------------------------------------------------------------------
create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled Study Deck',
  description text,
  module_code text,
  created_at timestamptz not null default now()
);
create index if not exists decks_user_idx on public.decks (user_id);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  question text not null,
  answer text not null,
  ease_factor numeric not null default 2.5,
  interval integer not null default 0,
  repetitions integer not null default 0,
  next_review timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists cards_deck_idx on public.cards (deck_id);

-- ----------------------------------------------------------------------------
-- mcq_quizzes: generated multiple-choice quizzes (JSONB question payloads)
-- ----------------------------------------------------------------------------
create table if not exists public.mcq_quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  module_code text,
  title text not null default 'Untitled Quiz',
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists mcq_quizzes_user_idx on public.mcq_quizzes (user_id);

-- ----------------------------------------------------------------------------
-- code_exams: Gemini-generated coding challenges + user solutions
-- ----------------------------------------------------------------------------
create table if not exists public.code_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  module_code text,
  title text not null default 'Untitled Code Exam',
  language text not null default 'javascript',
  exam_type text not null default 'bug_fix',
  prompt text not null default '',
  starter_code text,
  solution_code text,
  user_code text,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists code_exams_user_idx on public.code_exams (user_id);

-- ----------------------------------------------------------------------------
-- tasks: academic to-dos, optionally attached to a module
-- ----------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  module_code text,
  title text not null,
  due_date text,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists tasks_user_idx on public.tasks (user_id);

-- ----------------------------------------------------------------------------
-- documents: uploaded notes/PDFs with AI summary + glossary for the AI Tutor
-- ----------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  module_code text,
  title text not null default 'Untitled Document',
  content text not null default '',
  summary text,
  glossary jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists documents_user_idx on public.documents (user_id);

-- ----------------------------------------------------------------------------
-- grades: assessment components used by the Grade Predictor
-- ----------------------------------------------------------------------------
create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  module_code text,
  title text not null default 'Assessment',
  weight numeric not null default 0,      -- percentage weight of final grade
  score numeric,                          -- achieved score (null = not graded yet)
  target_grade numeric not null default 40, -- desired final grade %
  created_at timestamptz not null default now()
);
create index if not exists grades_user_idx on public.grades (user_id);

-- ----------------------------------------------------------------------------
-- focus_sessions: completed Pomodoro focus logs for the Weekly Study Goal
-- ----------------------------------------------------------------------------
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  minutes integer not null default 0,
  mode text not null default 'work',
  created_at timestamptz not null default now()
);
create index if not exists focus_sessions_user_idx on public.focus_sessions (user_id, created_at);

-- ----------------------------------------------------------------------------
-- active_recall_logs: AI "blurting" evaluations of free-recall attempts
-- ----------------------------------------------------------------------------
create table if not exists public.active_recall_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  module_code text,
  topic text not null default '',
  accuracy integer not null default 0,   -- 0-100 recall accuracy
  content text,                          -- what the user wrote
  report jsonb not null default '[]'::jsonb, -- color-coded concept report
  created_at timestamptz not null default now()
);
create index if not exists active_recall_logs_user_idx on public.active_recall_logs (user_id, created_at);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.user_profiles enable row level security;
alter table public.modules       enable row level security;
alter table public.decks         enable row level security;
alter table public.cards         enable row level security;
alter table public.mcq_quizzes   enable row level security;
alter table public.code_exams    enable row level security;
alter table public.tasks         enable row level security;
alter table public.documents     enable row level security;
alter table public.grades        enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.active_recall_logs enable row level security;

-- Helper: (re)create a policy without erroring if it already exists.
do $$
begin
  -- user_profiles: id == auth.uid()
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_profiles' and policyname = 'user_profiles_owner') then
    create policy user_profiles_owner on public.user_profiles
      for all using (auth.uid() = id) with check (auth.uid() = id);
  end if;

  -- Owned-by-user_id tables
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'modules' and policyname = 'modules_owner') then
    create policy modules_owner on public.modules
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'decks' and policyname = 'decks_owner') then
    create policy decks_owner on public.decks
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mcq_quizzes' and policyname = 'mcq_quizzes_owner') then
    create policy mcq_quizzes_owner on public.mcq_quizzes
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'code_exams' and policyname = 'code_exams_owner') then
    create policy code_exams_owner on public.code_exams
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tasks' and policyname = 'tasks_owner') then
    create policy tasks_owner on public.tasks
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'documents_owner') then
    create policy documents_owner on public.documents
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'grades' and policyname = 'grades_owner') then
    create policy grades_owner on public.grades
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'focus_sessions' and policyname = 'focus_sessions_owner') then
    create policy focus_sessions_owner on public.focus_sessions
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'active_recall_logs' and policyname = 'active_recall_logs_owner') then
    create policy active_recall_logs_owner on public.active_recall_logs
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  -- cards are owned transitively via their parent deck
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cards' and policyname = 'cards_owner') then
    create policy cards_owner on public.cards
      for all using (
        exists (select 1 from public.decks d where d.id = cards.deck_id and d.user_id = auth.uid())
      ) with check (
        exists (select 1 from public.decks d where d.id = cards.deck_id and d.user_id = auth.uid())
      );
  end if;
end $$;

-- ============================================================================
-- Auto-provision a user_profiles row whenever a new auth user signs up
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name, preferred_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), '')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- v2.2.0 additive migrations (idempotent)
-- ============================================================================

-- user_profiles.prefs: free-form client preferences (widgets, a11y, nav)
alter table public.user_profiles add column if not exists prefs jsonb not null default '{}'::jsonb;

-- modules: nested folders via parent_code + tags
alter table public.modules add column if not exists parent_code text;
alter table public.modules add column if not exists tags text[] not null default '{}';

-- document_revisions: AI notes summary edit history
create table if not exists public.document_revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  summary text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists document_revisions_doc_idx on public.document_revisions (document_id, created_at desc);
create index if not exists document_revisions_user_idx on public.document_revisions (user_id);

-- tutor_messages: independent AI Tutor chat persistence
create table if not exists public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'user',
  content text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists tutor_messages_user_idx on public.tutor_messages (user_id, created_at);

-- note_chunks: RAG index passages for uploaded notes
create table if not exists public.note_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid references public.documents (id) on delete cascade,
  chunk_index integer not null default 0,
  content text not null default '',
  embedding jsonb,
  created_at timestamptz not null default now()
);
create index if not exists note_chunks_user_idx on public.note_chunks (user_id);
create index if not exists note_chunks_doc_idx on public.note_chunks (document_id);

alter table public.document_revisions enable row level security;
alter table public.tutor_messages enable row level security;
alter table public.note_chunks enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'document_revisions' and policyname = 'document_revisions_owner') then
    create policy document_revisions_owner on public.document_revisions
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tutor_messages' and policyname = 'tutor_messages_owner') then
    create policy tutor_messages_owner on public.tutor_messages
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'note_chunks' and policyname = 'note_chunks_owner') then
    create policy note_chunks_owner on public.note_chunks
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
