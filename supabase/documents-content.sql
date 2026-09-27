-- ============================================================================
-- Fios Smart Notes — documents.content (idempotent, copy-paste into Supabase SQL)
-- ============================================================================
-- Symptom:
--   Could not find the 'content' column of 'documents' in the schema cache
--
-- Steps:
--   1. Run this entire script in the Supabase SQL editor.
--   2. Confirm Reload: Project Settings → API → Reload schema
--      (this script also runs NOTIFY pgrst, 'reload schema').
--   3. Retry Smart Notes → Summarize & Save.
--
-- Safe to re-run. Canonical column is `content`. Legacy body/text/notes
-- values are copied into content when content is empty.
-- ============================================================================

alter table public.documents
  add column if not exists content text not null default '';

comment on column public.documents.content is
  'Full note / extracted PDF text for Smart Notes and AI Tutor grounding.';

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
