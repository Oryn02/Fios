-- ============================================================================
-- Fios v3.6.0 — modules.exam_date as timestamptz (idempotent)
-- ============================================================================
-- Overview “Exam & submission countdown” and Revision Flight Plan expect a
-- real exam datetime. Legacy installs may still have exam_date as `date`
-- (date-only, midnight) or missing the column entirely.
--
-- Steps:
--   1. Run this entire script in the Supabase SQL editor.
--   2. Project Settings → API → Reload schema
--      (this script also runs NOTIFY pgrst, 'reload schema').
--   3. Modules → Edit (or Create) → set Exam date & time → Save.
--
-- Safe to re-run.
-- ============================================================================

alter table public.modules add column if not exists exam_date timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'modules'
      and column_name = 'exam_date'
      and data_type = 'date'
  ) then
    alter table public.modules
      alter column exam_date type timestamptz
      using (exam_date::timestamp without time zone at time zone 'Europe/Dublin');
  end if;
end $$;

comment on column public.modules.exam_date is
  'Optional exam datetime (timestamptz). Powers Overview countdown and Revision Flight Plan.';

notify pgrst, 'reload schema';
