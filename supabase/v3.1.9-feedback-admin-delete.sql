-- ============================================================================
-- Fios v3.1.9 — durable feedback row delete (idempotent)
-- ============================================================================
-- Symptom: UI remove "succeeds" or appears to, then Refresh brings the row
-- back — or PostgREST DELETE returns 0 rows under RLS (no error).
--
-- v3.1.2 only created feedback_admin_delete when missing; it did not repair a
-- wrong policy, table grants, or PostgREST cache, and had no NOTIFY.
--
-- This script:
--   • recreates current_user_is_admin()
--   • DROP + CREATE feedback_admin_delete (+ select/update as needed)
--   • grants DELETE/SELECT/UPDATE on feedback to authenticated
--   • adds SECURITY DEFINER RPCs so deletes succeed even if RLS cache is stale
--   • NOTIFY pgrst, 'reload schema'
--
-- Steps:
--   1. Run this entire script in the Supabase SQL editor.
--   2. Confirm Project Settings → API → Reload schema if needed
--      (NOTIFY below usually suffices).
--   3. Ensure your operator uid is in public.fios_admins.
--
-- Safe to re-run.
-- ============================================================================

create extension if not exists "pgcrypto";

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

alter table public.feedback
  add column if not exists resolved_at timestamptz;
alter table public.feedback
  add column if not exists resolved_by uuid references auth.users (id) on delete set null;

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

-- Table privileges (RLS still applies for direct table access).
grant select, insert, update, delete on table public.feedback to authenticated;
grant select on table public.fios_admins to authenticated;

-- Repair policies: drop + create so a stale/wrong definition cannot linger.
drop policy if exists feedback_admin_delete on public.feedback;
create policy feedback_admin_delete on public.feedback
  for delete to authenticated
  using (public.current_user_is_admin());

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feedback'
      and policyname = 'feedback_select_own_or_admin'
  ) then
    create policy feedback_select_own_or_admin on public.feedback
      for select to authenticated
      using (user_id = auth.uid() or public.current_user_is_admin());
  end if;

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

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fios_admins'
      and policyname = 'fios_admins_self_read'
  ) then
    create policy fios_admins_self_read on public.fios_admins
      for select using (auth.uid() = user_id or public.current_user_is_admin());
  end if;
end $$;

-- SECURITY DEFINER RPCs: bypass table RLS after an explicit admin check.
-- Prefer these from the client when direct DELETE + RETURNING is unreliable.
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

notify pgrst, 'reload schema';
