-- ============================================================================
-- Fios v3.1.8 — user_profiles.birthday (idempotent)
-- ============================================================================
-- Optional birthday for Overview "Happy Birthday" greeting + day-only
-- birthday accent theme / ambience (month/day match; year kept for storage).
--
-- Steps:
--   1. Run this entire script in the Supabase SQL editor.
--   2. Project Settings → API → Reload schema
--      (this script also runs NOTIFY pgrst, 'reload schema').
--   3. Settings → Profile → set Birthday and Save.
--
-- Safe to re-run.
-- ============================================================================

alter table public.user_profiles add column if not exists birthday date;

comment on column public.user_profiles.birthday is
  'Optional user birthday (date). App matches month/day locally for greeting + birthday theme.';

notify pgrst, 'reload schema';
