-- ============================================================================
-- Fios v4.0.0 — Citations, Clipper, Importers, Offline, STEM, LMS, RPG,
-- Socratic Tutor, Course Bank community library
-- Idempotent; additive. Does not drop SM-2 columns or break v3.8.0 SaaS pack.
-- Paste into Supabase SQL editor. Mirror: supabase/migrations/20261001_fios_v390.sql
-- Docs copy: /cursor/stores/self/docs/fios-v4.0.0-citations-clipper-offline.sql
-- ============================================================================
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Cards: source-grounded citations + interactive code card fields
-- ----------------------------------------------------------------------------
alter table public.cards add column if not exists source_page integer;
alter table public.cards add column if not exists source_paragraph integer;
alter table public.cards add column if not exists source_quote text;
alter table public.cards add column if not exists source_document_id uuid
  references public.documents (id) on delete set null;
alter table public.cards add column if not exists card_type text not null default 'basic';
  -- basic | code
alter table public.cards add column if not exists code_language text;
alter table public.cards add column if not exists starter_code text;
alter table public.cards add column if not exists expected_output text;
alter table public.cards add column if not exists solution_code text;

create index if not exists cards_source_doc_idx
  on public.cards (source_document_id) where source_document_id is not null;
create index if not exists cards_type_idx on public.cards (card_type);

-- RAG chunk provenance (page + paragraph)
alter table public.note_chunks add column if not exists page_number integer;
alter table public.note_chunks add column if not exists paragraph_index integer;
alter table public.note_chunks add column if not exists source_quote text;

-- Documents: optional PDF storage hint for View Source
alter table public.documents add column if not exists pdf_storage_path text;
alter table public.documents add column if not exists page_count integer;
alter table public.documents add column if not exists source_filename text;

-- ----------------------------------------------------------------------------
-- user_streaks: RPG skill points, unlocks, weekend streak freeze
-- ----------------------------------------------------------------------------
alter table public.user_streaks add column if not exists skill_points integer not null default 0;
alter table public.user_streaks add column if not exists unlocked_rewards jsonb not null default '[]'::jsonb;
alter table public.user_streaks add column if not exists streak_freeze_until date;
alter table public.user_streaks add column if not exists lobby_border text not null default 'default';
alter table public.user_streaks add column if not exists active_theme_unlock text;

-- Allow owners to update their own streak row (client RPG spend / freeze)
drop policy if exists user_streaks_update_own on public.user_streaks;
create policy user_streaks_update_own on public.user_streaks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists user_streaks_insert_own on public.user_streaks;
create policy user_streaks_insert_own on public.user_streaks
  for insert with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- LMS connections + pulled materials
-- ----------------------------------------------------------------------------
create table if not exists public.lms_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('canvas', 'moodle', 'blackboard')),
  base_url text not null,
  display_name text,
  -- Token stored client-side encrypted hint OR server env; never log.
  access_token_enc text,
  refresh_meta jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, provider, base_url)
);
create index if not exists lms_connections_user_idx on public.lms_connections (user_id);

create table if not exists public.lms_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  connection_id uuid not null references public.lms_connections (id) on delete cascade,
  external_id text,
  title text not null,
  material_type text not null default 'file'
    check (material_type in ('syllabus', 'slides', 'file', 'assignment', 'page')),
  course_name text,
  module_code text,
  url text,
  content_text text,
  due_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists lms_materials_user_idx on public.lms_materials (user_id, due_at);

alter table public.lms_connections enable row level security;
alter table public.lms_materials enable row level security;

drop policy if exists lms_connections_owner on public.lms_connections;
create policy lms_connections_owner on public.lms_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists lms_materials_owner on public.lms_materials;
create policy lms_materials_owner on public.lms_materials
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.lms_connections to authenticated;
grant select, insert, update, delete on public.lms_materials to authenticated;

-- ----------------------------------------------------------------------------
-- Course Bank community library: votes + view/clone counters
-- ----------------------------------------------------------------------------
alter table public.shared_resources add column if not exists view_count integer not null default 0;
alter table public.shared_resources add column if not exists clone_count integer not null default 0;
alter table public.shared_resources add column if not exists upvote_count integer not null default 0;
alter table public.shared_resources add column if not exists downvote_count integer not null default 0;

create table if not exists public.resource_votes (
  resource_id uuid not null references public.shared_resources (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (resource_id, user_id)
);
create index if not exists resource_votes_user_idx on public.resource_votes (user_id);

alter table public.resource_votes enable row level security;

drop policy if exists resource_votes_select on public.resource_votes;
create policy resource_votes_select on public.resource_votes
  for select using (true);

drop policy if exists resource_votes_upsert_own on public.resource_votes;
create policy resource_votes_upsert_own on public.resource_votes
  for insert with check (auth.uid() = user_id);

drop policy if exists resource_votes_update_own on public.resource_votes;
create policy resource_votes_update_own on public.resource_votes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists resource_votes_delete_own on public.resource_votes;
create policy resource_votes_delete_own on public.resource_votes
  for delete using (auth.uid() = user_id);

-- Course-bank rows readable by any authenticated user (already typical via visibility)
-- Ensure authenticated can update counters via SECURITY DEFINER helpers below.

create or replace function public.fios_record_resource_view(p_resource_id uuid)
returns public.shared_resources
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.shared_resources;
begin
  update public.shared_resources
    set view_count = coalesce(view_count, 0) + 1
  where id = p_resource_id
    and visibility = 'course_bank'
  returning * into row;
  return row;
end;
$$;

create or replace function public.fios_clone_shared_deck(p_resource_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  res public.shared_resources;
  src_deck public.decks;
  new_deck_id uuid;
  uid uuid := auth.uid();
  card_count integer := 0;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into res from public.shared_resources
    where id = p_resource_id and visibility = 'course_bank';
  if not found then
    raise exception 'Resource not found';
  end if;
  if res.resource_type <> 'deck' or res.resource_id is null then
    raise exception 'Only deck resources can be cloned via this helper';
  end if;

  select * into src_deck from public.decks where id = res.resource_id;
  if not found then
    -- Fallback: payload may embed cards
    insert into public.decks (user_id, title, module_code, description)
      values (
        uid,
        coalesce(res.title, 'Cloned deck') || ' (clone)',
        res.module_code,
        'Cloned from Course Bank'
      )
      returning id into new_deck_id;

    insert into public.cards (
      deck_id, question, answer, ease_factor, interval, repetitions, next_review, scheduler
    )
    select
      new_deck_id,
      coalesce(c->>'front', c->>'question', ''),
      coalesce(c->>'back', c->>'answer', ''),
      2.5, 0, 0, now(), 'sm2'
    from jsonb_array_elements(coalesce(res.payload->'cards', '[]'::jsonb)) as c
    where coalesce(c->>'front', c->>'question', '') <> ''
       or coalesce(c->>'back', c->>'answer', '') <> '';

    get diagnostics card_count = row_count;
  else
    insert into public.decks (user_id, title, module_code, description)
      values (
        uid,
        coalesce(src_deck.title, res.title, 'Cloned deck') || ' (clone)',
        coalesce(src_deck.module_code, res.module_code),
        'Cloned from Course Bank'
      )
      returning id into new_deck_id;

    insert into public.cards (
      deck_id, question, answer, ease_factor, interval, repetitions, next_review,
      scheduler, fsrs_state, card_type, code_language, starter_code, expected_output,
      solution_code, source_page, source_paragraph, source_quote
    )
    select
      new_deck_id,
      c.question,
      c.answer,
      2.5, 0, 0, now(),
      'sm2', null,
      coalesce(c.card_type, 'basic'),
      c.code_language, c.starter_code, c.expected_output, c.solution_code,
      c.source_page, c.source_paragraph, c.source_quote
    from public.cards c
    where c.deck_id = src_deck.id;

    get diagnostics card_count = row_count;
  end if;

  update public.shared_resources
    set clone_count = coalesce(clone_count, 0) + 1
  where id = p_resource_id;

  return jsonb_build_object(
    'deck_id', new_deck_id,
    'card_count', card_count,
    'title', (select title from public.decks where id = new_deck_id)
  );
end;
$$;

create or replace function public.fios_vote_resource(p_resource_id uuid, p_vote smallint)
returns public.shared_resources
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  prev smallint;
  row public.shared_resources;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_vote not in (-1, 1) then
    raise exception 'vote must be -1 or 1';
  end if;

  select vote into prev from public.resource_votes
    where resource_id = p_resource_id and user_id = uid;

  if prev is null then
    insert into public.resource_votes (resource_id, user_id, vote)
      values (p_resource_id, uid, p_vote);
    if p_vote = 1 then
      update public.shared_resources
        set upvote_count = coalesce(upvote_count, 0) + 1
      where id = p_resource_id;
    else
      update public.shared_resources
        set downvote_count = coalesce(downvote_count, 0) + 1
      where id = p_resource_id;
    end if;
  elsif prev = p_vote then
    -- toggle off
    delete from public.resource_votes
      where resource_id = p_resource_id and user_id = uid;
    if p_vote = 1 then
      update public.shared_resources
        set upvote_count = greatest(0, coalesce(upvote_count, 0) - 1)
      where id = p_resource_id;
    else
      update public.shared_resources
        set downvote_count = greatest(0, coalesce(downvote_count, 0) - 1)
      where id = p_resource_id;
    end if;
  else
    update public.resource_votes
      set vote = p_vote, updated_at = now()
      where resource_id = p_resource_id and user_id = uid;
    if p_vote = 1 then
      update public.shared_resources
        set upvote_count = coalesce(upvote_count, 0) + 1,
            downvote_count = greatest(0, coalesce(downvote_count, 0) - 1)
      where id = p_resource_id;
    else
      update public.shared_resources
        set downvote_count = coalesce(downvote_count, 0) + 1,
            upvote_count = greatest(0, coalesce(upvote_count, 0) - 1)
      where id = p_resource_id;
    end if;
  end if;

  select * into row from public.shared_resources where id = p_resource_id;
  return row;
end;
$$;

grant execute on function public.fios_record_resource_view(uuid) to authenticated;
grant execute on function public.fios_clone_shared_deck(uuid) to authenticated;
grant execute on function public.fios_vote_resource(uuid, smallint) to authenticated;
grant select, insert, update, delete on public.resource_votes to authenticated;

-- ----------------------------------------------------------------------------
-- Mind maps (graph jsonb) + lounge room codes (light persistence)
-- ----------------------------------------------------------------------------
create table if not exists public.mind_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Mind Map',
  source_document_id uuid references public.documents (id) on delete set null,
  graph jsonb not null default '{"title":"Mind Map","nodes":[],"edges":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mind_maps_user_idx on public.mind_maps (user_id);

alter table public.mind_maps enable row level security;

drop policy if exists mind_maps_owner on public.mind_maps;
create policy mind_maps_owner on public.mind_maps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.mind_maps to authenticated;

create table if not exists public.lounge_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid references auth.users (id) on delete set null,
  topic text,
  created_at timestamptz not null default now()
);
create index if not exists lounge_rooms_code_idx on public.lounge_rooms (code);

alter table public.lounge_rooms enable row level security;

-- Rooms are discoverable by code; any authenticated user may create / read.
drop policy if exists lounge_rooms_select on public.lounge_rooms;
create policy lounge_rooms_select on public.lounge_rooms
  for select using (auth.uid() is not null);

drop policy if exists lounge_rooms_insert on public.lounge_rooms;
create policy lounge_rooms_insert on public.lounge_rooms
  for insert with check (auth.uid() is not null and (host_id is null or host_id = auth.uid()));

drop policy if exists lounge_rooms_update_host on public.lounge_rooms;
create policy lounge_rooms_update_host on public.lounge_rooms
  for update using (auth.uid() = host_id) with check (auth.uid() = host_id);

drop policy if exists lounge_rooms_delete_host on public.lounge_rooms;
create policy lounge_rooms_delete_host on public.lounge_rooms
  for delete using (auth.uid() = host_id);

grant select, insert, update, delete on public.lounge_rooms to authenticated;

-- ----------------------------------------------------------------------------
-- Live lecture + viva coach session logs
-- ----------------------------------------------------------------------------
create table if not exists public.lecture_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Live lecture',
  module_code text,
  transcript text,
  summary text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists lecture_sessions_user_idx on public.lecture_sessions (user_id);

alter table public.lecture_sessions enable row level security;
drop policy if exists lecture_sessions_owner on public.lecture_sessions;
create policy lecture_sessions_owner on public.lecture_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.lecture_sessions to authenticated;

create table if not exists public.viva_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content_preview text,
  last_transcript text,
  wpm integer,
  filler_count integer,
  last_question text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists viva_sessions_user_idx on public.viva_sessions (user_id);

alter table public.viva_sessions enable row level security;
drop policy if exists viva_sessions_owner on public.viva_sessions;
create policy viva_sessions_owner on public.viva_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.viva_sessions to authenticated;

-- ----------------------------------------------------------------------------
-- v3.9.0 pack finish: JOL, mock exams, focus buddy, syllabus events
-- ----------------------------------------------------------------------------
create table if not exists public.card_jol (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  predicted smallint not null check (predicted between 1 and 5),
  actual_success boolean,
  created_at timestamptz not null default now()
);
create index if not exists card_jol_user_idx on public.card_jol (user_id, created_at desc);
create index if not exists card_jol_card_idx on public.card_jol (card_id);

alter table public.card_jol enable row level security;
drop policy if exists card_jol_owner on public.card_jol;
create policy card_jol_owner on public.card_jol
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.card_jol to authenticated;

create table if not exists public.mock_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  module_code text,
  title text not null default 'Mock Exam',
  duration_min integer not null default 90,
  questions jsonb not null default '[]'::jsonb,
  answers jsonb,
  grade_result jsonb,
  status text not null default 'ready',
  graded_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists mock_exams_user_idx on public.mock_exams (user_id, created_at desc);

alter table public.mock_exams enable row level security;
drop policy if exists mock_exams_owner on public.mock_exams;
create policy mock_exams_owner on public.mock_exams
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.mock_exams to authenticated;

create table if not exists public.focus_buddy_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  partner_id uuid references auth.users (id) on delete set null,
  module_code text,
  room_code text,
  goal text,
  duration_min integer not null default 50,
  started_at timestamptz,
  ended_at timestamptz,
  checkin_note text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists focus_buddy_user_idx on public.focus_buddy_sessions (user_id, created_at desc);

alter table public.focus_buddy_sessions enable row level security;
drop policy if exists focus_buddy_owner on public.focus_buddy_sessions;
create policy focus_buddy_owner on public.focus_buddy_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.focus_buddy_sessions to authenticated;

create table if not exists public.syllabus_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  module_code text,
  title text not null,
  event_type text not null default 'deadline',
  event_date date,
  event_time text,
  description text,
  source_excerpt text,
  created_at timestamptz not null default now()
);
create index if not exists syllabus_events_user_idx on public.syllabus_events (user_id, event_date);

alter table public.syllabus_events enable row level security;
drop policy if exists syllabus_events_owner on public.syllabus_events;
create policy syllabus_events_owner on public.syllabus_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.syllabus_events to authenticated;

-- Notify PostgREST
notify pgrst, 'reload schema';

-- ============================================================================
-- v3.9.0 continuation — cognitive science, graph, community, debates, macros
-- ============================================================================

-- Metacognitive JOL
alter table public.cards add column if not exists jol_bucket text;
alter table public.cards add column if not exists blind_spot boolean not null default false;
alter table public.cards add column if not exists fail_streak integer not null default 0;
alter table public.cards add column if not exists icon_hint text;
alter table public.cards add column if not exists diagram_mermaid text;
alter table public.cards add column if not exists audio_mnemonic text;
alter table public.cards add column if not exists energy_tier text; -- high | moderate | fog

create table if not exists public.card_jol_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  jol text not null check (jol in ('guessing', 'unsure', 'certain')),
  rating integer,
  created_at timestamptz not null default now()
);
create index if not exists card_jol_events_user_idx on public.card_jol_events (user_id, created_at desc);
alter table public.card_jol_events enable row level security;
drop policy if exists card_jol_events_owner on public.card_jol_events;
create policy card_jol_events_owner on public.card_jol_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.card_jol_events to authenticated;

-- Past paper matrices + knowledge graph (+ optional pgvector)
create table if not exists public.past_paper_matrices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  module_code text,
  matrix jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.past_paper_matrices enable row level security;
drop policy if exists past_paper_owner on public.past_paper_matrices;
create policy past_paper_owner on public.past_paper_matrices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.past_paper_matrices to authenticated;

create table if not exists public.knowledge_edges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_card_id uuid references public.cards (id) on delete cascade,
  target_card_id uuid references public.cards (id) on delete cascade,
  score numeric,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists knowledge_edges_user_idx on public.knowledge_edges (user_id);
alter table public.knowledge_edges enable row level security;
drop policy if exists knowledge_edges_owner on public.knowledge_edges;
create policy knowledge_edges_owner on public.knowledge_edges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.knowledge_edges to authenticated;

-- pgvector embeddings (optional — requires extension on project)
create extension if not exists vector;
alter table public.cards add column if not exists embedding vector(768);
create table if not exists public.card_embeddings (
  card_id uuid primary key references public.cards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  embedding vector(768),
  updated_at timestamptz not null default now()
);
alter table public.card_embeddings enable row level security;
drop policy if exists card_embeddings_owner on public.card_embeddings;
create policy card_embeddings_owner on public.card_embeddings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.card_embeddings to authenticated;

-- Debate rooms
create table if not exists public.debate_rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  topic text not null,
  module_code text,
  material text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
create table if not exists public.debate_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.debate_rooms (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  topic text,
  side_a text,
  side_b text,
  score jsonb,
  created_at timestamptz not null default now()
);
alter table public.debate_rooms enable row level security;
alter table public.debate_rounds enable row level security;
drop policy if exists debate_rooms_all on public.debate_rooms;
create policy debate_rooms_all on public.debate_rooms for all using (auth.uid() is not null) with check (auth.uid() = owner_id);
drop policy if exists debate_rounds_all on public.debate_rounds;
create policy debate_rounds_all on public.debate_rounds for all using (auth.uid() is not null) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.debate_rooms to authenticated;
grant select, insert, update, delete on public.debate_rounds to authenticated;

-- Learning macros + peer review + community verified
create table if not exists public.learning_macros (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  recall integer not null default 0,
  synthesis integer not null default 0,
  application integer not null default 0,
  target_recall integer not null default 20,
  target_synthesis integer not null default 5,
  target_application integer not null default 5,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.learning_macros enable row level security;
drop policy if exists learning_macros_owner on public.learning_macros;
create policy learning_macros_owner on public.learning_macros
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.learning_macros to authenticated;

alter table public.shared_resources add column if not exists community_verified boolean not null default false;
alter table public.shared_resources add column if not exists directory_boost integer not null default 0;

create table if not exists public.peer_card_reviews (
  resource_id uuid not null references public.shared_resources (id) on delete cascade,
  card_index integer not null default 0,
  user_id uuid not null references auth.users (id) on delete cascade,
  verdict text not null check (verdict in ('approve', 'reject')),
  updated_at timestamptz not null default now(),
  primary key (resource_id, card_index, user_id)
);
alter table public.peer_card_reviews enable row level security;
drop policy if exists peer_card_reviews_owner on public.peer_card_reviews;
create policy peer_card_reviews_owner on public.peer_card_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists peer_card_reviews_select on public.peer_card_reviews;
create policy peer_card_reviews_select on public.peer_card_reviews for select using (auth.uid() is not null);
grant select, insert, update, delete on public.peer_card_reviews to authenticated;

-- Mock exams persistence
create table if not exists public.mock_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  module_code text,
  exam jsonb not null default '{}'::jsonb,
  result jsonb,
  created_at timestamptz not null default now()
);
alter table public.mock_exams enable row level security;
drop policy if exists mock_exams_owner on public.mock_exams;
create policy mock_exams_owner on public.mock_exams
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.mock_exams to authenticated;

notify pgrst, 'reload schema';
