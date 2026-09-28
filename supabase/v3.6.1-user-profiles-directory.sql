-- ============================================================================
-- Fios v3.6.1 — user_profiles directory for operators (idempotent)
-- ============================================================================
-- Symptom: operator Users directory shows exactly one profile (yourself)
-- even when many auth users / user_profiles rows exist. No error is shown.
--
-- Root cause:
--   • Without a working user_profiles_admin_read policy, SELECT only matches
--     user_profiles_owner (auth.uid() = id) → one row, silently.
--   • v3.1.1 only CREATE POLICY … IF NOT EXISTS — it never repaired a wrong
--     or stale policy, and shipped no SECURITY DEFINER list RPC / NOTIFY.
--
-- This script:
--   • recreates current_user_is_admin()
--   • DROP + CREATE user_profiles_admin_read
--   • grants SELECT on user_profiles / fios_admins to authenticated
--   • adds admin_list_user_profiles / admin_count_user_profiles RPCs
--     (bypass table RLS after an explicit admin check; safe columns only)
--   • NOTIFY pgrst, 'reload schema'
--
-- Steps:
--   1. Run this entire script in the Supabase SQL editor.
--   2. Confirm Project Settings → API → Reload schema if needed
--      (NOTIFY below usually suffices).
--   3. Ensure your operator uid is in public.fios_admins:
--        insert into public.fios_admins (user_id)
--        values ('YOUR_OPERATOR_UUID')
--        on conflict do nothing;
--
-- Safe to re-run. Does not expose gemini_api_key / address via the RPCs.
-- ============================================================================

create extension if not exists "pgcrypto";

-- Ensure columns the directory selects exist (additive).
alter table public.user_profiles add column if not exists full_name text;
alter table public.user_profiles add column if not exists preferred_name text;
alter table public.user_profiles add column if not exists accent_color text not null default 'emerald';
alter table public.user_profiles add column if not exists theme text not null default 'dark';
alter table public.user_profiles add column if not exists weekly_study_goal_hours integer not null default 10;
alter table public.user_profiles add column if not exists created_at timestamptz not null default now();
alter table public.user_profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.fios_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.fios_admins enable row level security;
alter table public.user_profiles enable row level security;

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
grant select on table public.user_profiles to authenticated;
grant select on table public.fios_admins to authenticated;

-- Repair policies: drop + create so a stale/wrong definition cannot linger.
drop policy if exists user_profiles_admin_read on public.user_profiles;
create policy user_profiles_admin_read on public.user_profiles
  for select to authenticated
  using (public.current_user_is_admin());

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fios_admins'
      and policyname = 'fios_admins_self_read'
  ) then
    create policy fios_admins_self_read on public.fios_admins
      for select using (auth.uid() = user_id or public.current_user_is_admin());
  end if;

  -- Owner policy must remain so users can still read/write their own row.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_profiles'
      and policyname = 'user_profiles_owner'
  ) then
    create policy user_profiles_owner on public.user_profiles
      for all using (auth.uid() = id) with check (auth.uid() = id);
  end if;
end $$;

-- SECURITY DEFINER RPCs: bypass table RLS after an explicit admin check.
-- Prefer these from the client when direct SELECT only returns the caller's row.
create or replace function public.admin_list_user_profiles(p_limit integer default 200)
returns table (
  id uuid,
  preferred_name text,
  full_name text,
  accent_color text,
  theme text,
  weekly_study_goal_hours integer,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.current_user_is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select
    p.id,
    p.preferred_name,
    p.full_name,
    p.accent_color,
    p.theme,
    p.weekly_study_goal_hours,
    p.created_at,
    p.updated_at
  from public.user_profiles p
  order by p.created_at desc nulls last, p.id asc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
end;
$$;

create or replace function public.admin_count_user_profiles()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
begin
  if auth.uid() is null or not public.current_user_is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select count(*)::bigint into n from public.user_profiles;
  return coalesce(n, 0);
end;
$$;

revoke all on function public.admin_list_user_profiles(integer) from public;
revoke all on function public.admin_count_user_profiles() from public;
grant execute on function public.admin_list_user_profiles(integer) to authenticated;
grant execute on function public.admin_count_user_profiles() to authenticated;

notify pgrst, 'reload schema';
