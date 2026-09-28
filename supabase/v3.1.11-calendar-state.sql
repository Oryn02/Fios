-- ============================================================================
-- Fios v3.1.11 — calendar_state (idempotent)
-- ============================================================================
-- Durable offline-first iCal / schedule subscription + sync state.
-- Local client writes first; this table is the cloud copy reconciled when online.
--
-- Steps:
--   1. Run this entire script in the Supabase SQL editor.
--   2. Project Settings → API → Reload schema
--      (this script also runs NOTIFY pgrst, 'reload schema').
--
-- Safe to re-run.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.calendar_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  ical_url text not null default '',
  mode text not null default 'ical',
  institution_name text not null default '',
  last_synced_at timestamptz,
  last_sync_error text,
  events_cache jsonb not null default '[]'::jsonb,
  manual_events jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.calendar_state add column if not exists ical_url text not null default '';
alter table public.calendar_state add column if not exists mode text not null default 'ical';
alter table public.calendar_state add column if not exists institution_name text not null default '';
alter table public.calendar_state add column if not exists last_synced_at timestamptz;
alter table public.calendar_state add column if not exists last_sync_error text;
alter table public.calendar_state add column if not exists events_cache jsonb not null default '[]'::jsonb;
alter table public.calendar_state add column if not exists manual_events jsonb not null default '[]'::jsonb;
alter table public.calendar_state add column if not exists updated_at timestamptz not null default now();

comment on table public.calendar_state is
  'Per-user iCal/subscription/sync state + cached events for offline-first schedule.';

alter table public.calendar_state enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'calendar_state'
      and policyname = 'calendar_state_owner'
  ) then
    create policy calendar_state_owner on public.calendar_state
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

notify pgrst, 'reload schema';
