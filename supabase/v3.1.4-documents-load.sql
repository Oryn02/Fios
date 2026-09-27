-- ============================================================================
-- Fios v3.1.4 — Smart Notes documents load alignment (idempotent)
-- ============================================================================
-- Symptom after applying a consolidated documents schema:
--   Smart Notes list shows "Documents load failed" / empty notes
--   PostgREST errors on select/order (missing columns, stale schema cache)
--   OR insert fails: null value in column "summary" violates not-null
--
-- Aligns live DB with client (documentService / DocumentsView):
--   content text not null default ''
--   summary text not null default ''
--   glossary jsonb not null default '[]'::jsonb
--   module_code, title, created_at
--   RLS policy documents_owner
--
-- Steps:
--   1. Run this entire script in the Supabase SQL editor.
--   2. Project Settings → API → Reload schema
--      (this script also runs NOTIFY pgrst, 'reload schema').
--   3. Retry Smart Notes → open the tab / Summarize & Save.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  module_code text,
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

-- content / summary: not null + empty-string defaults (matches consolidated schema)
update public.documents set content = '' where content is null;
alter table public.documents alter column content set default '';
alter table public.documents alter column content set not null;

update public.documents set summary = '' where summary is null;
alter table public.documents alter column summary set default '';
alter table public.documents alter column summary set not null;

-- glossary: ensure jsonb array default (coerce nulls)
update public.documents set glossary = '[]'::jsonb where glossary is null;
alter table public.documents alter column glossary set default '[]'::jsonb;
alter table public.documents alter column glossary set not null;

comment on column public.documents.content is
  'Full note / extracted PDF text for Smart Notes and AI Tutor grounding.';
comment on column public.documents.summary is
  'AI-generated summary from Summarize & Save (not null; default empty string).';
comment on column public.documents.glossary is
  'AI glossary terms [{term, definition}, ...] from Summarize & Save.';

-- Copy legacy body aliases into content when content is still empty.
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
