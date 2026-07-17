-- Timesheets: per-user, per-calendar-week time tracking for TV FFS / ver.di contracts.
--
-- Three tables:
--   timesheets             – one record per user per calendar week
--   timesheet_entries      – one record per day (7 rows per sheet, Mon–Sun)
--   project_timesheet_defaults – per-project defaults (Bundesland, rate type, AZV counter)
--
-- All money stored in euro-cents (integer). No floating-point currency.

-- ---------------------------------------------------------------------------
-- 1. timesheets
-- ---------------------------------------------------------------------------
create table if not exists public.timesheets (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete set null,

  -- ISO date of the Monday that starts this week (unique per user per week)
  week_start  date not null,

  -- Workflow status
  status      text not null default 'draft'
              check (status in ('draft', 'submitted', 'approved')),

  -- Snapshot fields (filled in by user when creating the sheet)
  person_name  text not null default '',
  position_title text not null default '',
  department   text not null default '',

  -- ── Calculation settings ─────────────────────────────────────────────────
  -- 'full_tarif'   = TV FFS 2024 rules, all defaults locked
  -- 'custom_tarif' = TV FFS as default; individual params overridable
  calc_mode    text not null default 'full_tarif'
               check (calc_mode in ('full_tarif', 'custom_tarif')),

  -- 'standard' = weekly rate covers 50 h (§ 5.3.1 TV FFS)
  -- 'reduced'  = 80 % weekly rate, covers 40 h (§ 5.3.3 TV FFS)
  rate_type    text not null default 'standard'
               check (rate_type in ('standard', 'reduced')),

  -- Weekly gross rate in euro-cents (e.g. 205300 = €2 053.00)
  weekly_rate_cents integer not null default 0,

  -- Apply § 5.2.4 daily minimum: each started day billed ≥ 8 h for pay purposes.
  -- When false (custom): actual hours billed at hourly rate with no floor.
  daily_minimum_8h boolean not null default true,

  -- Per diem defaults for this sheet (§ 12.2 TV FFS)
  per_diem_enabled          boolean not null default true,
  per_diem_full_day_cents   integer not null default 2800,   -- German tax flat rate (24 h away)
  per_diem_partial_day_cents integer not null default 1400,  -- German tax flat rate (>8 h away)

  -- Overridable rules (only used when calc_mode = 'custom_tarif'; null = use TV FFS default)
  -- Stored as JSONB so new override fields can be added without migrations.
  -- Shape documented in lib/timesheets/ruleset.ts (CustomRulesOverride).
  custom_rules jsonb,

  unique (user_id, week_start)
);

comment on table public.timesheets is
  'Weekly timesheet per user. Calculation follows TV FFS (ver.di) October 2024.';
comment on column public.timesheets.week_start is
  'ISO date of the Monday that starts the week (YYYY-MM-DD).';
comment on column public.timesheets.weekly_rate_cents is
  'Weekly gross rate in euro-cents. 0 = not yet set.';
comment on column public.timesheets.daily_minimum_8h is
  'TV FFS § 5.2.4: each started workday billed at minimum 8 h for pay purposes. Set false to bill actual hours at hourly rate (custom mode only).';

-- ---------------------------------------------------------------------------
-- 2. timesheet_entries  (7 rows per timesheet, Mon–Sun)
-- ---------------------------------------------------------------------------
create table if not exists public.timesheet_entries (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  timesheet_id   uuid not null references public.timesheets(id) on delete cascade,
  entry_date     date not null,

  -- Times as text 'HH:MM' (24-hour); null = not worked that day
  work_start     text,   -- 'HH:MM'
  work_end       text,   -- 'HH:MM'

  break_minutes  integer not null default 0,

  -- § 5.2.2 TV FFS: ordered travel counts as working time.
  -- § 12.4: travel from residence to remote location (>20 km) counts.
  -- travel_qualifies = user confirms this travel is compensable.
  travel_to_minutes   integer not null default 0,
  travel_back_minutes integer not null default 0,
  travel_qualifies    boolean not null default false,

  -- Einsatzort (place of work) – free text from template column 8
  place_of_work  text,

  -- Bundesland code (DE-BY, DE-NW, …) for public-holiday detection.
  -- § 5.6.1: holidays are "gesetzliche Feiertage am Arbeitsort".
  bundesland     text,

  -- Per-diem type for this specific day (§ 12.2 TV FFS).
  -- 'auto' = derive from billed hours (≥8 h → partial, else none)
  -- 'partial' = €14 partial-day flat rate
  -- 'full'    = €28 full-day flat rate (overnight stay)
  -- 'none'    = no per diem
  per_diem_type  text not null default 'auto'
                 check (per_diem_type in ('auto', 'partial', 'full', 'none')),

  notes          text,

  unique (timesheet_id, entry_date)
);

comment on table public.timesheet_entries is
  'One row per day (Mon–Sun) for a timesheet week.';
comment on column public.timesheet_entries.bundesland is
  'DE-{state} code used to look up public holidays for that day (§ 5.6.1 TV FFS).';

-- ---------------------------------------------------------------------------
-- 3. project_timesheet_defaults  (project-level settings + AZV tracking)
-- ---------------------------------------------------------------------------
create table if not exists public.project_timesheet_defaults (
  project_id    uuid primary key references public.projects(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Default Bundesland for new timesheets linked to this project
  bundesland    text not null default 'DE-BY',

  -- Default rate type for new timesheets
  rate_type     text not null default 'standard'
                check (rate_type in ('standard', 'reduced')),

  -- Default weekly rate in cents (0 = not configured)
  weekly_rate_cents integer not null default 0,

  -- Per-diem default
  per_diem_enabled boolean not null default true,

  -- AZV-Tag tracking (§ 6 TV FFS, effective 01.05.2025).
  -- Running total of confirmed shooting days for the production.
  -- AZV entitlement = floor(total_shoot_days / 20) days.
  total_shoot_days integer not null default 0
);

comment on table public.project_timesheet_defaults is
  'Per-project timesheet defaults and AZV shooting-day counter (§ 6 TV FFS).';
comment on column public.project_timesheet_defaults.total_shoot_days is
  'Running total of shooting days for AZV-Tag calculation (§ 6 TV FFS). AZV days earned = floor(total / 20).';

-- ---------------------------------------------------------------------------
-- 4. updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_timesheets_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists timesheets_set_updated_at on public.timesheets;
create trigger timesheets_set_updated_at
  before update on public.timesheets
  for each row execute function public.set_timesheets_updated_at();

drop trigger if exists timesheet_entries_set_updated_at on public.timesheet_entries;
create trigger timesheet_entries_set_updated_at
  before update on public.timesheet_entries
  for each row execute function public.set_timesheets_updated_at();

drop trigger if exists project_timesheet_defaults_updated_at on public.project_timesheet_defaults;
create trigger project_timesheet_defaults_updated_at
  before update on public.project_timesheet_defaults
  for each row execute function public.set_timesheets_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.timesheets enable row level security;
alter table public.timesheet_entries enable row level security;
alter table public.project_timesheet_defaults enable row level security;

-- Helper: check admin role from JWT app_metadata (same pattern as existing RLS)
create or replace function public.auth_is_admin()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

-- timesheets: owners + admins
create policy "timesheets_select" on public.timesheets for select to authenticated
  using (user_id = auth.uid() or public.auth_is_admin());

create policy "timesheets_insert" on public.timesheets for insert to authenticated
  with check (user_id = auth.uid() or public.auth_is_admin());

create policy "timesheets_update" on public.timesheets for update to authenticated
  using (user_id = auth.uid() or public.auth_is_admin())
  with check (user_id = auth.uid() or public.auth_is_admin());

create policy "timesheets_delete" on public.timesheets for delete to authenticated
  using (user_id = auth.uid() or public.auth_is_admin());

-- timesheet_entries: inherit via parent timesheet ownership
create policy "timesheet_entries_select" on public.timesheet_entries for select to authenticated
  using (
    exists (
      select 1 from public.timesheets t
      where t.id = timesheet_id
        and (t.user_id = auth.uid() or public.auth_is_admin())
    )
  );

create policy "timesheet_entries_insert" on public.timesheet_entries for insert to authenticated
  with check (
    exists (
      select 1 from public.timesheets t
      where t.id = timesheet_id
        and (t.user_id = auth.uid() or public.auth_is_admin())
    )
  );

create policy "timesheet_entries_update" on public.timesheet_entries for update to authenticated
  using (
    exists (
      select 1 from public.timesheets t
      where t.id = timesheet_id
        and (t.user_id = auth.uid() or public.auth_is_admin())
    )
  );

create policy "timesheet_entries_delete" on public.timesheet_entries for delete to authenticated
  using (
    exists (
      select 1 from public.timesheets t
      where t.id = timesheet_id
        and (t.user_id = auth.uid() or public.auth_is_admin())
    )
  );

-- project_timesheet_defaults: readable by any authenticated user; writable by admins
create policy "ptd_select" on public.project_timesheet_defaults for select to authenticated
  using (true);

create policy "ptd_insert" on public.project_timesheet_defaults for insert to authenticated
  with check (public.auth_is_admin());

create policy "ptd_update" on public.project_timesheet_defaults for update to authenticated
  using (public.auth_is_admin());

create policy "ptd_delete" on public.project_timesheet_defaults for delete to authenticated
  using (public.auth_is_admin());
