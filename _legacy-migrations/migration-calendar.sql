-- ─── Project Calendars (sub-calendars) ────────────────────────────────────

create table if not exists project_calendars (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  project_id  uuid not null references projects(id) on delete cascade,
  name        text not null,
  color       text not null default '#3B82F6',
  is_visible  boolean default true,
  sort_order  int  default 0
);

-- Add columns if they don't exist yet (idempotent)
alter table project_calendars
  add column if not exists share_token uuid default gen_random_uuid() unique;

alter table project_calendars
  add column if not exists sort_order int default 0;

-- Backfill any rows that have no share_token
update project_calendars set share_token = gen_random_uuid() where share_token is null;

alter table project_calendars enable row level security;

drop policy if exists "Users manage their project calendars" on project_calendars;
create policy "Users manage their project calendars"
  on project_calendars for all
  using   (project_id in (select id from projects where user_id = auth.uid()))
  with check (project_id in (select id from projects where user_id = auth.uid()));

-- Public read by share_token (ICS sharing — UUID as secret URL)
drop policy if exists "Public read shared calendar by token" on project_calendars;
create policy "Public read shared calendar by token"
  on project_calendars for select
  using (share_token is not null);

-- ─── Calendar Events ───────────────────────────────────────────────────────

create table if not exists calendar_events (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  calendar_id uuid not null references project_calendars(id) on delete cascade,
  title       text not null,
  start_date  timestamptz not null,
  end_date    timestamptz not null,
  is_all_day  boolean default false,
  location    text,
  notes       text,
  status      text default 'confirmed' check (status in ('tentative', 'confirmed', 'cancelled'))
);

alter table calendar_events enable row level security;

drop policy if exists "Users manage their calendar events" on calendar_events;
create policy "Users manage their calendar events"
  on calendar_events for all
  using (
    calendar_id in (
      select pc.id from project_calendars pc
      join projects p on p.id = pc.project_id
      where p.user_id = auth.uid()
    )
  )
  with check (
    calendar_id in (
      select pc.id from project_calendars pc
      join projects p on p.id = pc.project_id
      where p.user_id = auth.uid()
    )
  );

-- Public read events of shared calendars
drop policy if exists "Public read events of shared calendar" on calendar_events;
create policy "Public read events of shared calendar"
  on calendar_events for select
  using (
    calendar_id in (
      select id from project_calendars where share_token is not null
    )
  );
