-- ============================================================================
-- Fios v3.1.3 — Smart Notes documents columns (idempotent)
-- ============================================================================
-- Symptom (PostgREST / schema cache):
--   Could not find the 'glossary' column of 'documents' in the schema cache
--   (also content / summary / module_code on older projects)
--
-- Steps:
--   1. Run this entire script in the Supabase SQL editor.
--   2. Confirm Reload: Project Settings → API → Reload schema
--      (this script also runs NOTIFY pgrst, 'reload schema').
--   3. Retry Smart Notes → Summarize & Save.
--
-- Safe to re-run. Aligns live DB with client upserts in documentService /
-- DocumentsView (title, content, summary, glossary, module_code).
-- ============================================================================

-- Ensure table exists (no-op when already created by schema.sql).
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

-- Additive columns for projects that created `documents` before these fields.
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

comment on column public.documents.content is
  'Full note / extracted PDF text for Smart Notes and AI Tutor grounding.';
comment on column public.documents.summary is
  'AI-generated summary from Summarize & Save.';
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
