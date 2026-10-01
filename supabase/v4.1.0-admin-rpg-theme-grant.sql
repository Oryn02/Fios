-- ============================================================================
-- Fios — operator RPG theme grant (idempotent)
-- SECURITY DEFINER RPC so operators in fios_admins can append unlock rewards
-- onto any user's user_streaks.unlocked_rewards (and optionally apply accent).
-- Safe to re-run. Does not appear in public product docs.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.fios_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

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

create table if not exists public.user_streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  xp integer not null default 0,
  last_study_date date,
  skill_points integer not null default 0,
  unlocked_rewards jsonb not null default '[]'::jsonb,
  streak_freeze_until date,
  lobby_border text not null default 'default',
  updated_at timestamptz not null default now()
);

alter table public.user_streaks add column if not exists skill_points integer not null default 0;
alter table public.user_streaks add column if not exists unlocked_rewards jsonb not null default '[]'::jsonb;

create or replace function public.admin_grant_rpg_reward(
  p_user_id uuid,
  p_reward text,
  p_apply_accent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rewards jsonb;
  v_arr text[];
  v_next text[];
  v_row public.user_streaks%rowtype;
begin
  if not public.current_user_is_admin() then
    raise exception 'not authorized';
  end if;
  if p_user_id is null or coalesce(trim(p_reward), '') = '' then
    raise exception 'user_id and reward required';
  end if;

  select * into v_row from public.user_streaks where user_id = p_user_id;
  if not found then
    insert into public.user_streaks (user_id, unlocked_rewards, updated_at)
    values (p_user_id, jsonb_build_array(trim(p_reward)), now())
    returning * into v_row;
  else
    v_rewards := coalesce(v_row.unlocked_rewards, '[]'::jsonb);
    select coalesce(array_agg(x), array[]::text[])
      into v_arr
      from jsonb_array_elements_text(v_rewards) as t(x);
    if not (trim(p_reward) = any (v_arr)) then
      v_next := v_arr || trim(p_reward);
      update public.user_streaks
        set unlocked_rewards = to_jsonb(v_next),
            updated_at = now()
        where user_id = p_user_id
        returning * into v_row;
    end if;
  end if;

  if p_apply_accent is not null and trim(p_apply_accent) <> '' then
    update public.user_profiles
      set accent_color = trim(p_apply_accent),
          updated_at = now()
      where id = p_user_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'unlocked_rewards', coalesce(v_row.unlocked_rewards, '[]'::jsonb),
    'applied_accent', p_apply_accent
  );
end;
$$;

revoke all on function public.admin_grant_rpg_reward(uuid, text, text) from public;
grant execute on function public.admin_grant_rpg_reward(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
