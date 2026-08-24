-- Pathway of Power — portal + command-center schema (v2, mirrors the Replit app)
-- One brain: the coach (service role) writes everything; each client reads ONLY their own.
-- Isolation is enforced at the database with Row-Level Security. v1 login = last-4 of phone
-- verified server-side (a Next.js route/Edge Function sets a signed cookie, then reads with
-- the service role). Ported faithfully from lib/db/src/schema/* — the scoring engine
-- (progressEngine.ts) is the crown jewel and expects these shapes.

create extension if not exists "pgcrypto";
create extension if not exists "vector";      -- per-client AI companion (RAG)

-- Clean slate for the client-scoped layer (only client-zero seed lived here).
drop table if exists practice_completions cascade;
drop table if exists practice_assignments cascade;
drop table if exists routine_steps cascade;
drop table if exists client_milestones cascade;
drop table if exists chat_messages cascade;
drop table if exists daily_hla cascade;
drop table if exists daily_progress cascade;
drop table if exists portal_sections cascade;
drop table if exists sections cascade;
drop table if exists actions cascade;
drop table if exists practices cascade;
drop table if exists routines cascade;
drop table if exists sessions cascade;
drop table if exists clients cascade;

-- ── Clients ────────────────────────────────────────────────────────────────
create table clients (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,               -- portal URL: /p/<slug>
  name          text not null,
  phone_last4   text not null,                       -- the login key (checked server-side)
  email         text,
  program       text default 'Life Alchemy',
  timezone      text default 'America/Los_Angeles',  -- drives local-midnight rollover
  start_date    date default current_date,
  cover_url     text,
  welcome       text,
  -- denormalized momentum state (progressEngine writes these on finalizeDay)
  current_streak           int default 0,
  longest_streak           int default 0,
  good_day_streak          int default 0,
  longest_good_day_streak  int default 0,
  grace_day_week_of        date,
  total_points             int default 0,
  health_status            text default 'good',      -- red|yellow|good|great|perfect (7d avg)
  ai_context               text,                     -- distilled profile injected into AI prompt
  status        text default 'active',
  created_at    timestamptz default now()
);

-- ── Actions (daily anchors / to-dos) ───────────────────────────────────────
create table actions (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references clients(id) on delete cascade,
  title          text not null,
  description    text,
  icon           text,
  assigned_date  date not null default current_date,
  is_completed   boolean default false,
  completed_at   timestamptz,
  display_order  int default 0,
  cadence        text default 'daily',               -- daily | one_time
  is_scoring     boolean default true,               -- 67% FIX: only scoring items count toward pct
  makeup_eligible     boolean default false,
  action_timing_type  text default 'stackable',      -- stackable|time_locked|same_day_preferred|coach_review_required
  recovery_window     text default 'same_day',       -- same_day|this_week|recovery_saturday|none
  created_by     text default 'coach',               -- coach|client|agent
  recovered_at   timestamptz,
  external_id    text,
  unique (client_id, external_id, assigned_date)
);

-- ── Routines + steps (morning/evening blocks; only required steps score) ────
create table routines (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid references clients(id) on delete cascade,
  title          text not null,
  time_block     text default 'morning',
  active         boolean default true,
  sort_order     int default 0,
  scheduled_time text,
  bunny_url      text
);
create table routine_steps (
  id               uuid primary key default gen_random_uuid(),
  routine_id       uuid not null references routines(id) on delete cascade,
  step_order       int default 0,
  title            text not null,
  description      text,
  media_url        text,
  video_url        text,
  duration_minutes int,
  instructions     text,
  points           int default 5,
  required         boolean default true
);

-- ── Daily progress (score + reflection; the engine's spine) ─────────────────
create table daily_progress (
  id                   uuid primary key default gen_random_uuid(),
  client_id            uuid not null references clients(id) on delete cascade,
  date                 date not null,
  completed            boolean default false,          -- "good day"
  points_earned        int default 0,
  completed_step_ids   jsonb default '[]',
  completion_pct       int,                            -- null = nothing assigned (no penalty)
  tier                 text,                           -- red|yellow|good|great|perfect
  recovered_action_ids jsonb default '[]',
  -- reflection / check-in layer (written by the Check-in screen)
  mood                 int,
  note                 text,
  energy_level         int,
  nervous_system_state text,                           -- grounded|clear|activated|anxious|overwhelmed|collapsed
  win                  text,
  avoided              text,
  support_needed       text,
  reflection_submitted_at timestamptz,
  finalized            boolean default false,
  unique (client_id, date)
);

-- ── Daily HLA (the one high-leverage action today) ──────────────────────────
create table daily_hla (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references clients(id) on delete cascade,
  date           date not null,
  title          text not null,
  why            text,
  next_step      text,
  time_window    text,
  status         text default 'pending',
  confidence     text,
  fallback_prompt text,
  source         text default 'coach',
  unique (client_id, date)
);

-- ── Practices (library) + completions ───────────────────────────────────────
create table practices (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid references clients(id) on delete cascade,   -- null = shared library
  title            text not null,
  description      text,
  bunny_url        text,
  poster_url       text,
  media_type       text default 'audio',               -- audio | video
  duration_minutes int,
  involves         text,
  good_for_when    text,
  helps_with       text,
  tags             text,
  suggested_usage  text,
  is_practice_of_day boolean default false,
  assigned_date    date,
  is_published     boolean default true,
  display_order    int default 0
);
create table practice_completions (
  id             uuid primary key default gen_random_uuid(),
  practice_id    uuid not null references practices(id) on delete cascade,
  client_id      uuid not null references clients(id) on delete cascade,
  completed_at   timestamptz default now(),
  completed_date date default current_date,
  note           text,
  unique (practice_id, client_id, completed_date)
);

-- ── Sessions (call replays + transcripts; also AI RAG source) ───────────────
create table sessions (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references clients(id) on delete cascade,
  title              text not null,
  session_date       date,
  duration           text,
  video_url          text,
  poster_url         text,
  transcript_text    text,
  summary            jsonb default '[]',
  chapters           jsonb default '[]',
  key_themes         jsonb default '[]',
  action_items       jsonb default '[]',
  include_in_ai_context boolean default true,
  private_to_coach   boolean default false,
  zoom_recording_uuid text,
  external_id        text,
  sort               int default 0,
  created_at         timestamptz default now()
);

-- ── Portal sections (the Vault: text/links/replay/actions blocks) ───────────
create table portal_sections (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references clients(id) on delete cascade,
  section_type   text not null default 'text',        -- text|links|replay|actions|vision|agreement
  title          text,
  body           text,
  media_url      text,
  thumbnail_url  text,
  metadata       jsonb default '{}',                  -- links[], items[], secondary video
  display_order  int default 0,
  is_visible     boolean default true,
  external_id    text
);

-- ── Milestones (one-time streak celebrations) ───────────────────────────────
create table client_milestones (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id) on delete cascade,
  milestone_key text not null,                         -- "<type>-<value>"
  streak_type   text not null,                         -- momentum | good_day
  value         int not null,
  achieved_at   timestamptz default now(),
  seen_at       timestamptz,
  pushed_at     timestamptz,
  unique (client_id, milestone_key)
);

-- ── AI companion: chat + grounding knowledge ────────────────────────────────
create table chat_messages (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  conversation_id text,
  role            text not null,                       -- user | assistant
  content         text not null,
  created_at      timestamptz default now()
);
create table coach_knowledge (
  id             uuid primary key default gen_random_uuid(),
  key            text unique not null,                 -- safety_boundaries|pathway_of_power_core|iem_protocols|voice_guide
  title          text,
  content        text not null,
  source         text,
  source_url     text,
  embedding      vector(1536),                         -- optional semantic retrieval
  created_at     timestamptz default now()
);

-- ── Row-Level Security (default-deny; server uses the service role) ─────────
alter table clients             enable row level security;
alter table actions             enable row level security;
alter table routines            enable row level security;
alter table routine_steps       enable row level security;
alter table daily_progress      enable row level security;
alter table daily_hla           enable row level security;
alter table practices           enable row level security;
alter table practice_completions enable row level security;
alter table sessions            enable row level security;
alter table portal_sections     enable row level security;
alter table client_milestones   enable row level security;
alter table chat_messages       enable row level security;
alter table coach_knowledge     enable row level security;
-- No anon policies on purpose. All reads go through the server-side last-4 gate,
-- which uses the service role to return ONLY the matched client's rows. Even a
-- leaked anon key returns zero rows. The service role bypasses RLS and is the
-- coach command center + pipeline writer; it is NEVER shipped to the browser.
