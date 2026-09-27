-- ============================================================================
-- Fios Smart Notes — documents columns (idempotent, copy-paste into Supabase SQL)
-- ============================================================================
-- Prefer the versioned hotfix scripts:
--   supabase/v3.1.5-documents-module-code.sql  (module_code 23502)
--   supabase/v3.1.4-documents-load.sql         (load / summary)
--
-- Symptoms:
--   Could not find the 'glossary' column of 'documents' in the schema cache
--   Could not find the 'content' column of 'documents' in the schema cache
--   Could not find the 'summary' column of 'documents' in the schema cache
--   Documents load failed after consolidated schema apply
--   null value in column "module_code" … violates not-null constraint (23502)
--
-- Steps:
--   1. Run this entire script in the Supabase SQL editor.
--   2. Confirm Reload: Project Settings → API → Reload schema
--      (this script also runs NOTIFY pgrst, 'reload schema').
--   3. Retry Smart Notes → open tab / Summarize & Save.
--
-- Safe to re-run. Canonical columns: content + summary text not null default '',
-- glossary jsonb default [], module_code text nullable default '', title,
-- created_at, documents_owner RLS.
-- Legacy body/text/notes values are copied into content when content is empty.
-- ============================================================================

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
