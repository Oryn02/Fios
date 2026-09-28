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
  birthday date,
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
-- Live DBs created before created_at/updated_at existed need these alters —
-- `create table if not exists` will NOT add missing columns on an old table.
alter table public.user_profiles add column if not exists avatar_url text;
alter table public.user_profiles add column if not exists accent_color text not null default 'emerald';
alter table public.user_profiles add column if not exists theme text not null default 'dark';
alter table public.user_profiles add column if not exists gemini_api_key text;
alter table public.user_profiles add column if not exists weekly_study_goal_hours integer not null default 10;
alter table public.user_profiles add column if not exists pomodoro_work_duration integer not null default 25;
alter table public.user_profiles add column if not exists pomodoro_short_break integer not null default 5;
alter table public.user_profiles add column if not exists pomodoro_long_break integer not null default 15;
alter table public.user_profiles add column if not exists created_at timestamptz not null default now();
alter table public.user_profiles add column if not exists updated_at timestamptz not null default now();
alter table public.user_profiles add column if not exists full_name text;
alter table public.user_profiles add column if not exists preferred_name text;
alter table public.user_profiles add column if not exists address text;
alter table public.user_profiles add column if not exists birthday date;

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
-- v2.2.3 — specific start/due datetimes for unified agenda
alter table public.tasks add column if not exists due_at timestamptz;
alter table public.tasks add column if not exists start_at timestamptz;
create index if not exists tasks_user_idx on public.tasks (user_id);
create index if not exists tasks_due_at_idx on public.tasks (user_id, due_at);

-- ----------------------------------------------------------------------------
-- documents: uploaded notes/PDFs with AI summary + glossary for the AI Tutor
-- ----------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  module_code text default '',
  title text not null default 'Untitled Document',
  content text not null default '',
  summary text not null default '',
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

-- v3.1.0: align legacy live columns → canonical (idempotent).
-- Live v3.0.0 used assessment_name / weight_percentage / score_achieved and
-- had no target_grade — Grade Predictor saves failed with PGRST204.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'grades' and column_name = 'assessment_name'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'grades' and column_name = 'title'
  ) then
    alter table public.grades rename column assessment_name to title;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'grades' and column_name = 'weight_percentage'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'grades' and column_name = 'weight'
  ) then
    alter table public.grades rename column weight_percentage to weight;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'grades' and column_name = 'score_achieved'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'grades' and column_name = 'score'
  ) then
    alter table public.grades rename column score_achieved to score;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'grades' and column_name = 'target_grade'
  ) then
    alter table public.grades add column target_grade numeric not null default 40;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'grades' and column_name = 'title'
  ) then
    alter table public.grades add column title text not null default 'Assessment';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'grades' and column_name = 'weight'
  ) then
    alter table public.grades add column weight numeric not null default 0;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'grades' and column_name = 'score'
  ) then
    alter table public.grades add column score numeric;
  end if;
end $$;

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

-- ============================================================================
-- v2.2.3 — user feedback & ratings (admin inbox)
-- ============================================================================

create table if not exists public.fios_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  categories text[] not null default '{}',
  message text not null default '',
  anonymous boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_idx on public.feedback (created_at desc);
create index if not exists feedback_user_idx on public.feedback (user_id);

alter table public.fios_admins enable row level security;
alter table public.feedback enable row level security;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.fios_admins a where a.user_id = auth.uid()
  );
$$;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated;

grant select, insert, update, delete on table public.feedback to authenticated;
grant select on table public.fios_admins to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'fios_admins' and policyname = 'fios_admins_self_read') then
    create policy fios_admins_self_read on public.fios_admins
      for select using (auth.uid() = user_id OR public.current_user_is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'feedback' and policyname = 'feedback_insert_own') then
    create policy feedback_insert_own on public.feedback
      for insert to authenticated
      with check (
        (anonymous = false and user_id = auth.uid())
        or (anonymous = true and user_id is null)
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'feedback' and policyname = 'feedback_select_own_or_admin') then
    create policy feedback_select_own_or_admin on public.feedback
      for select to authenticated
      using (user_id = auth.uid() or public.current_user_is_admin());
  end if;
end $$;

-- Repair delete policy (drop + create). Standalone: supabase/v3.1.9-feedback-admin-delete.sql
drop policy if exists feedback_admin_delete on public.feedback;
create policy feedback_admin_delete on public.feedback
  for delete to authenticated
  using (public.current_user_is_admin());

-- SECURITY DEFINER RPCs for durable operator deletes (explicit admin check).
create or replace function public.admin_delete_feedback(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_id uuid;
begin
  if auth.uid() is null or not public.current_user_is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  delete from public.feedback where id = p_id returning id into deleted_id;
  return deleted_id;
end;
$$;

create or replace function public.admin_delete_feedback_ids(p_ids uuid[])
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_ids uuid[];
begin
  if auth.uid() is null or not public.current_user_is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_ids is null or cardinality(p_ids) = 0 then
    return array[]::uuid[];
  end if;
  with removed as (
    delete from public.feedback
    where id = any (p_ids)
    returning id
  )
  select coalesce(array_agg(id), array[]::uuid[]) into deleted_ids from removed;
  return deleted_ids;
end;
$$;

revoke all on function public.admin_delete_feedback(uuid) from public;
revoke all on function public.admin_delete_feedback_ids(uuid[]) from public;
grant execute on function public.admin_delete_feedback(uuid) to authenticated;
grant execute on function public.admin_delete_feedback_ids(uuid[]) to authenticated;

-- ============================================================================
-- Admin console: feedback resolve + profile directory (admin RLS only)
-- ============================================================================

alter table public.feedback
  add column if not exists resolved_at timestamptz;

alter table public.feedback
  add column if not exists resolved_by uuid references auth.users (id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feedback'
      and policyname = 'feedback_admin_update'
  ) then
    create policy feedback_admin_update on public.feedback
      for update to authenticated
      using (public.current_user_is_admin())
      with check (public.current_user_is_admin());
  end if;

  -- Admins may list basic profile rows (client must not select gemini_api_key).
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_profiles'
      and policyname = 'user_profiles_admin_read'
  ) then
    create policy user_profiles_admin_read on public.user_profiles
      for select to authenticated
      using (public.current_user_is_admin());
  end if;
end $$;

-- ============================================================================
-- Additive migrations (idempotent) — run in Supabase SQL editor if missing
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Smart Notes: documents columns (REQUIRED) — content / summary / glossary /
-- module_code. Prefer the standalone copy-paste migration:
--   supabase/v3.1.5-documents-module-code.sql  (module_code 23502 hotfix)
--   supabase/v3.1.4-documents-load.sql         (load / summary alignment)
-- Symptom if missing / cache stale / load failed / null module_code:
--   Could not find the 'glossary' column of 'documents' in the schema cache
--   Could not find the 'content' column of 'documents' in the schema cache
--   Could not find the 'summary' column of 'documents' in the schema cache
--   Documents load failed (PostgREST select/order) after consolidated schema
--   null value in column "module_code" … violates not-null constraint (23502)
-- Fix (idempotent — safe to re-run):
--   1. Run this block (or v3.1.5-documents-module-code.sql) in the SQL editor.
--   2. Reload PostgREST schema cache:
--        Dashboard → Project Settings → API → Reload schema
--      Or run:  NOTIFY pgrst, 'reload schema';
--      Or wait ~1 minute for auto-refresh.
-- Canonical columns match client upserts (documentService / DocumentsView):
--   content + summary text not null default '', glossary jsonb default [],
--   module_code text nullable default '' (General / unassigned).
-- If an older project used body/text/notes, values are copied into content below.
-- ----------------------------------------------------------------------------
alter table public.documents
  add column if not exists module_code text;

alter table public.documents
  add column if not exists title text not null default 'Untitled Document';

alter table public.documents
  add column if not exists content text not null default '';

alter table public.documents
  add column if not exists summary text;

alter table public.documents
  add column if not exists glossary jsonb not null default '[]'::jsonb;

alter table public.documents
  add column if not exists created_at timestamptz not null default now();

-- v3.1.5: module_code must accept General (empty); drop NOT NULL if live DB had it
update public.documents set module_code = '' where module_code is null;
alter table public.documents alter column module_code drop not null;
alter table public.documents alter column module_code set default '';

comment on column public.documents.module_code is
  'Optional module key; empty string = General / unassigned (nullable; default '''').';

update public.documents set content = '' where content is null;
alter table public.documents alter column content set default '';
alter table public.documents alter column content set not null;

update public.documents set summary = '' where summary is null;
alter table public.documents alter column summary set default '';
alter table public.documents alter column summary set not null;

update public.documents set glossary = '[]'::jsonb where glossary is null;
alter table public.documents alter column glossary set default '[]'::jsonb;
alter table public.documents alter column glossary set not null;

comment on column public.documents.content is
  'Full note / extracted PDF text for Smart Notes and AI Tutor grounding.';
comment on column public.documents.summary is
  'AI-generated summary from Summarize & Save (not null; default empty string).';
comment on column public.documents.glossary is
  'AI glossary terms [{term, definition}, ...] from Summarize & Save.';

-- Copy from legacy aliases when content is still empty (no-op if aliases absent).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'documents' and column_name = 'body'
  ) then
    execute $q$
      update public.documents
      set content = body
      where (content is null or content = '') and body is not null and body <> ''
    $q$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'documents' and column_name = 'text'
  ) then
    execute $q$
      update public.documents
      set content = text
      where (content is null or content = '') and text is not null and text <> ''
    $q$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'documents' and column_name = 'notes'
  ) then
    execute $q$
      update public.documents
      set content = notes
      where (content is null or content = '') and notes is not null and notes <> ''
    $q$;
  end if;
end $$;

notify pgrst, 'reload schema';

-- ============================================================================
-- Content flags — user-reported moderation queue (v3.1.1)
-- ============================================================================

create table if not exists public.content_flags (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users (id) on delete set null,
  target_type text not null
    check (target_type in ('deck', 'document', 'task', 'tutor_message', 'other')),
  target_id uuid,
  target_label text not null default '',
  reason text not null default 'other',
  details text not null default '',
  status text not null default 'open'
    check (status in ('open', 'resolved', 'dismissed')),
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);

create index if not exists content_flags_status_idx
  on public.content_flags (status, created_at desc);
create index if not exists content_flags_reporter_idx
  on public.content_flags (reporter_id);
create index if not exists content_flags_target_idx
  on public.content_flags (target_type, target_id);

alter table public.content_flags enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'content_flags'
      and policyname = 'content_flags_insert_own'
  ) then
    create policy content_flags_insert_own on public.content_flags
      for insert to authenticated
      with check (reporter_id = auth.uid() or public.current_user_is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'content_flags'
      and policyname = 'content_flags_select_own_or_admin'
  ) then
    create policy content_flags_select_own_or_admin on public.content_flags
      for select to authenticated
      using (reporter_id = auth.uid() or public.current_user_is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'content_flags'
      and policyname = 'content_flags_admin_update'
  ) then
    create policy content_flags_admin_update on public.content_flags
      for update to authenticated
      using (public.current_user_is_admin())
      with check (public.current_user_is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'content_flags'
      and policyname = 'content_flags_admin_delete'
  ) then
    create policy content_flags_admin_delete on public.content_flags
      for delete to authenticated
      using (public.current_user_is_admin());
  end if;
end $$;

-- Ask PostgREST to refresh its schema cache (Supabase / PostgREST).
notify pgrst, 'reload schema';

-- Optional durable Web Push subscriptions (server currently uses an in-memory Map;
-- free Render instances lose memory on spin-down). Apply if you want persistence.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'push_subscriptions'
      and policyname = 'push_subscriptions_owner'
  ) then
    create policy push_subscriptions_owner on public.push_subscriptions
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;
