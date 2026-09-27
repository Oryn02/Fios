-- Fios v3.1.2 — durable admin feedback delete
-- Idempotent. Apply in Supabase SQL editor, then reload PostgREST schema cache
-- (Dashboard → Settings → API → Reload schema, or: NOTIFY pgrst, 'reload schema';).
--
-- Symptom fixed: trash icon removes a row in the UI, but Refresh brings it back
-- because PostgREST DELETE under RLS returns success with 0 rows when the
-- feedback_admin_delete policy is missing.

-- Ensure admin helper exists (no-op if already present from earlier schema).
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

alter table public.feedback enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback'
      and policyname = 'feedback_admin_delete'
  ) then
    create policy feedback_admin_delete on public.feedback
      for delete to authenticated
      using (public.current_user_is_admin());
  end if;
end $$;
