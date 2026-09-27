-- ============================================================================
-- Fios v3.1.5 — documents.module_code nullable + empty default (idempotent)
-- ============================================================================
-- Symptom (Postgres 23502 on Smart Notes → Summarize & Save):
--   null value in column "module_code" of relation "documents"
--   violates not-null constraint
--
-- Cause: some live DBs have documents.module_code NOT NULL, while the app
-- treats General / no module as empty. Canonical schema: module_code text
-- (nullable) with default ''.
--
-- Steps:
--   1. Run this entire script in the Supabase SQL editor.
--   2. Project Settings → API → Reload schema
--      (this script also runs NOTIFY pgrst, 'reload schema').
--   3. Retry Smart Notes → Summarize & Save (General / no module is fine).
--
-- Safe to re-run. Also hardens content / summary / glossary empty defaults
-- (same pattern as v3.1.4) so optional write paths never trip 23502.
-- ============================================================================

create extension if not exists "pgcrypto";

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

alter table public.documents add column if not exists module_code text;
alter table public.documents add column if not exists title text not null default 'Untitled Document';
alter table public.documents add column if not exists content text not null default '';
alter table public.documents add column if not exists summary text;
alter table public.documents add column if not exists glossary jsonb not null default '[]'::jsonb;
alter table public.documents add column if not exists created_at timestamptz not null default now();

-- module_code: coalesce nulls → '', drop NOT NULL if present, default ''
update public.documents set module_code = '' where module_code is null;
alter table public.documents alter column module_code drop not null;
alter table public.documents alter column module_code set default '';

comment on column public.documents.module_code is
  'Optional module key; empty string = General / unassigned (nullable; default '''').';

-- content / summary / glossary: empty-string / [] defaults (matches v3.1.4)
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

create index if not exists documents_user_idx on public.documents (user_id);

alter table public.documents enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'documents'
      and policyname = 'documents_owner'
  ) then
    create policy documents_owner on public.documents
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

notify pgrst, 'reload schema';
