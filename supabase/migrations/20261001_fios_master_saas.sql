-- ============================================================================
-- Fios Master SaaS — 2026-10-01 (v3.8.0)
-- Idempotent; additive. Does not drop SM-2 columns or modules.exam_date.
-- Paste into Supabase SQL editor OR apply via migrations workflow.
-- Mirror: supabase/v3.8.0-master-saas.sql
-- ============================================================================
create extension if not exists "pgcrypto";

-- Token / quota metering (platform key). BYO usage may insert billed=false rows.
create table if not exists public.user_usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tokens_used bigint not null default 0,
  tokens_limit bigint not null default 500000,
  period_start timestamptz not null default date_trunc('month', now()),
  plan text not null default 'free', -- free | pro | classroom
  stripe_customer_id text,
  lemon_customer_id text,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  xp integer not null default 0,
  last_study_date date,
  updated_at timestamptz not null default now()
);

-- Multi-exam support (complements modules.exam_date)
create table if not exists public.module_exams (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Exam',
  exam_at timestamptz not null,
  weight numeric,
  created_at timestamptz not null default now()
);
create index if not exists module_exams_user_idx on public.module_exams (user_id, exam_at);
create index if not exists module_exams_module_idx on public.module_exams (module_id);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'blocked', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);

create table if not exists public.study_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  is_classroom boolean not null default false,
  invite_code text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.study_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'teacher', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists group_members_user_idx on public.group_members (user_id);

create table if not exists public.shared_resources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  resource_type text not null
    check (resource_type in ('deck', 'document', 'quiz', 'module', 'link')),
  resource_id uuid,
  title text not null,
  module_code text,
  payload jsonb not null default '{}'::jsonb,
  visibility text not null default 'friends'
    check (visibility in ('private', 'friends', 'group', 'course_bank')),
  group_id uuid references public.study_groups (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists shared_resources_owner_idx on public.shared_resources (owner_id);
create index if not exists shared_resources_course_idx
  on public.shared_resources (module_code) where visibility = 'course_bank';

create table if not exists public.card_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  rating integer not null check (rating between 1 and 4),
  scheduler text not null default 'fsrs',
  duration_ms integer,
  state_before jsonb,
  state_after jsonb,
  created_at timestamptz not null default now()
);
create index if not exists card_reviews_user_day_idx
  on public.card_reviews (user_id, created_at desc);

create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users (id) on delete cascade,
  group_id uuid references public.study_groups (id) on delete set null,
  title text not null default 'Live quiz',
  questions jsonb not null default '[]'::jsonb,
  status text not null default 'lobby'
    check (status in ('lobby', 'active', 'finished', 'cancelled')),
  invite_code text unique,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);

create table if not exists public.quiz_participants (
  session_id uuid not null references public.quiz_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text,
  score integer not null default 0,
  answers jsonb not null default '[]'::jsonb,
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

-- Additive FSRS fields on existing cards (keep SM-2 columns)
alter table public.cards add column if not exists scheduler text not null default 'sm2';
alter table public.cards add column if not exists fsrs_state jsonb;

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.user_usage enable row level security;
alter table public.user_streaks enable row level security;
alter table public.module_exams enable row level security;
alter table public.friendships enable row level security;
alter table public.study_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.shared_resources enable row level security;
alter table public.card_reviews enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.quiz_participants enable row level security;

drop policy if exists user_usage_select_own on public.user_usage;
create policy user_usage_select_own on public.user_usage
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists user_streaks_select_own on public.user_streaks;
create policy user_streaks_select_own on public.user_streaks
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists module_exams_owner on public.module_exams;
create policy module_exams_owner on public.module_exams
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists friendships_participants on public.friendships;
create policy friendships_participants on public.friendships
  for all to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists study_groups_member_select on public.study_groups;
create policy study_groups_member_select on public.study_groups
  for select to authenticated using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = study_groups.id and gm.user_id = auth.uid()
    )
  );

drop policy if exists study_groups_owner_write on public.study_groups;
create policy study_groups_owner_write on public.study_groups
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists group_members_select_visible on public.group_members;
create policy group_members_select_visible on public.group_members
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.group_members me
      where me.group_id = group_members.group_id and me.user_id = auth.uid()
    )
  );

drop policy if exists group_members_self_join on public.group_members;
create policy group_members_self_join on public.group_members
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists group_members_owner_manage on public.group_members;
create policy group_members_owner_manage on public.group_members
  for delete to authenticated using (
    exists (
      select 1 from public.study_groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
    or user_id = auth.uid()
  );

drop policy if exists shared_resources_owner on public.shared_resources;
create policy shared_resources_owner on public.shared_resources
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists shared_resources_friends_read on public.shared_resources;
create policy shared_resources_friends_read on public.shared_resources
  for select to authenticated using (
    visibility = 'course_bank'
    or (
      visibility = 'friends' and exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
          and (
            (f.requester_id = auth.uid() and f.addressee_id = shared_resources.owner_id)
            or (f.addressee_id = auth.uid() and f.requester_id = shared_resources.owner_id)
          )
      )
    )
    or (
      visibility = 'group' and group_id is not null and exists (
        select 1 from public.group_members gm
        where gm.group_id = shared_resources.group_id and gm.user_id = auth.uid()
      )
    )
  );

drop policy if exists card_reviews_owner on public.card_reviews;
create policy card_reviews_owner on public.card_reviews
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists quiz_sessions_host on public.quiz_sessions;
create policy quiz_sessions_host on public.quiz_sessions
  for all to authenticated
  using (host_id = auth.uid()) with check (host_id = auth.uid());

drop policy if exists quiz_sessions_participant_select on public.quiz_sessions;
create policy quiz_sessions_participant_select on public.quiz_sessions
  for select to authenticated using (
    exists (
      select 1 from public.quiz_participants qp
      where qp.session_id = quiz_sessions.id and qp.user_id = auth.uid()
    )
  );

drop policy if exists quiz_participants_select_peers on public.quiz_participants;
create policy quiz_participants_select_peers on public.quiz_participants
  for select to authenticated using (
    exists (
      select 1 from public.quiz_participants me
      where me.session_id = quiz_participants.session_id and me.user_id = auth.uid()
    )
    or exists (
      select 1 from public.quiz_sessions s
      where s.id = quiz_participants.session_id and s.host_id = auth.uid()
    )
  );

drop policy if exists quiz_participants_self_insert on public.quiz_participants;
create policy quiz_participants_self_insert on public.quiz_participants
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists quiz_participants_self_update on public.quiz_participants;
create policy quiz_participants_self_update on public.quiz_participants
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- Helpers: sync modules.exam_date from module_exams; seed usage/streaks on signup
-- ============================================================================
create or replace function public.sync_module_exam_date()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  mid uuid;
  soonest timestamptz;
begin
  mid := coalesce(new.module_id, old.module_id);
  select min(exam_at) into soonest
  from public.module_exams
  where module_id = mid and exam_at > now();
  if soonest is null then
    select max(exam_at) into soonest
    from public.module_exams
    where module_id = mid;
  end if;
  update public.modules
  set exam_date = soonest
  where id = mid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists module_exams_sync_exam_date on public.module_exams;
create trigger module_exams_sync_exam_date
  after insert or update or delete on public.module_exams
  for each row execute function public.sync_module_exam_date();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name, preferred_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), '')
  on conflict (id) do nothing;
  insert into public.user_usage (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  insert into public.user_streaks (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Grants (metering writes stay service-role; clients can select own rows)
grant select on public.user_usage to authenticated;
grant select on public.user_streaks to authenticated;
grant select, insert, update, delete on public.module_exams to authenticated;
grant select, insert, update, delete on public.friendships to authenticated;
grant select, insert, update, delete on public.study_groups to authenticated;
grant select, insert, delete on public.group_members to authenticated;
grant select, insert, update, delete on public.shared_resources to authenticated;
grant select, insert, update, delete on public.card_reviews to authenticated;
grant select, insert, update, delete on public.quiz_sessions to authenticated;
grant select, insert, update on public.quiz_participants to authenticated;
