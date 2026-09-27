-- ============================================================================
-- Fios v3.1.1 — additive Supabase migration (idempotent)
-- ============================================================================
-- Paste into Supabase SQL editor, then reload PostgREST schema cache:
--   Dashboard → Project Settings → API → Reload schema
--   Or:  NOTIFY pgrst, 'reload schema';
-- ============================================================================
-- Fixes:
--   • Admin Users: column user_profiles.created_at does not exist
--   • Admin Users: user_profiles_admin_read RLS
--   • Content moderation: content_flags table + RLS
--   • Prior admin bits: feedback.resolved_*, prefs jsonb
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---- user_profiles columns the admin directory selects --------------------
alter table public.user_profiles add column if not exists full_name text;
alter table public.user_profiles add column if not exists preferred_name text;
alter table public.user_profiles add column if not exists address text;
alter table public.user_profiles add column if not exists avatar_url text;
alter table public.user_profiles add column if not exists accent_color text not null default 'emerald';
alter table public.user_profiles add column if not exists theme text not null default 'dark';
alter table public.user_profiles add column if not exists gemini_api_key text;
alter table public.user_profiles add column if not exists weekly_study_goal_hours integer not null default 10;
alter table public.user_profiles add column if not exists pomodoro_work_duration integer not null default 25;
alter table public.user_profiles add column if not exists pomodoro_short_break integer not null default 5;
alter table public.user_profiles add column if not exists pomodoro_long_break integer not null default 15;
alter table public.user_profiles add column if not exists created_at timestamptz not null default now();
alter table public.user_profiles add column if not exists updated_at timestamptz not null default now();
alter table public.user_profiles add column if not exists prefs jsonb not null default '{}'::jsonb;

-- ---- fios_admins + helper (needed for admin RLS) --------------------------
create table if not exists public.fios_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.fios_admins enable row level security;

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

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fios_admins'
      and policyname = 'fios_admins_self_read'
  ) then
    create policy fios_admins_self_read on public.fios_admins
      for select using (auth.uid() = user_id OR public.current_user_is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_profiles'
      and policyname = 'user_profiles_admin_read'
  ) then
    create policy user_profiles_admin_read on public.user_profiles
      for select to authenticated
      using (public.current_user_is_admin());
  end if;
end $$;

-- ---- feedback resolve columns (prior admin console) -----------------------
alter table public.feedback
  add column if not exists resolved_at timestamptz;
alter table public.feedback
  add column if not exists resolved_by uuid references auth.users (id) on delete set null;

do $$
begin
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
end $$;

-- ---- content_flags (moderation queue) -------------------------------------
create table if not exists public.content_flags (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users (id) on delete set null,
  target_type text not null
    check (target_type in ('deck', 'document', 'task', 'tutor_message', 'other')),
  target_id uuid,
  target_label text not null default '',
  reason text not null default 'other',
  details text not null default '',
  status text not null default 'open'
    check (status in ('open', 'resolved', 'dismissed')),
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);

create index if not exists content_flags_status_idx
  on public.content_flags (status, created_at desc);
create index if not exists content_flags_reporter_idx
  on public.content_flags (reporter_id);
create index if not exists content_flags_target_idx
  on public.content_flags (target_type, target_id);

alter table public.content_flags enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'content_flags'
      and policyname = 'content_flags_insert_own'
  ) then
    create policy content_flags_insert_own on public.content_flags
      for insert to authenticated
      with check (reporter_id = auth.uid() or public.current_user_is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'content_flags'
      and policyname = 'content_flags_select_own_or_admin'
  ) then
    create policy content_flags_select_own_or_admin on public.content_flags
      for select to authenticated
      using (reporter_id = auth.uid() or public.current_user_is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'content_flags'
      and policyname = 'content_flags_admin_update'
  ) then
    create policy content_flags_admin_update on public.content_flags
      for update to authenticated
      using (public.current_user_is_admin())
      with check (public.current_user_is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'content_flags'
      and policyname = 'content_flags_admin_delete'
  ) then
    create policy content_flags_admin_delete on public.content_flags
      for delete to authenticated
      using (public.current_user_is_admin());
  end if;
end $$;

notify pgrst, 'reload schema';
