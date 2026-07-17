-- Schema cleanup: align Supabase schema with what the webapp actually uses.
--
-- Findings backing each change were verified against the live database
-- (rows + service-role row-count probes). Columns dropped here have either
-- zero rows of data or data that is fully duplicated by a column we keep.
--
-- Out of scope (intentionally kept):
--   - projects.assigned_people / organization_ids / budget / currency
--     (user wants to keep these latent for now)
--   - public.user_profiles + is_admin()
--     (has 1 row; auth flow uses JWT app_metadata.role but the SQL helper
--      may be referenced by future policies)
--   - people.address jsonb (heavily used by UI)
--   - calendar_events.last_modified / project_calendars.last_modified
--     (touched by the update_calendar_timestamps trigger)

-- ---------------------------------------------------------------------------
-- 1) Fix drift: webapp writes people.date_of_birth but the column was missing,
--    so every birthday edit fails with a 400. Add the column.
-- ---------------------------------------------------------------------------
alter table public.people
  add column if not exists date_of_birth date;

comment on column public.people.date_of_birth is
  'Crew member''s birthday. Used by the dashboard birthday calendar and the person detail form.';

-- ---------------------------------------------------------------------------
-- 2) Drop columns the webapp does not read or write.
--    Single-column indexes and FKs on these columns drop automatically with
--    the column (no CASCADE required).
-- ---------------------------------------------------------------------------

-- people
alter table public.people
  drop column if exists profession,    -- replaced by jobs jsonb; 1 stale row accepted as loss
  drop column if exists created_by,    -- never populated; ownership is via user_id
  drop column if exists documents;     -- uuid[]; never populated, documents table is being dropped

-- organizations
alter table public.organizations
  drop column if exists address,       -- jsonb duplicate of flat street/zip/city/country
  drop column if exists created_by,    -- never populated
  drop column if exists documents;     -- uuid[]; never populated

-- projects
alter table public.projects
  drop column if exists created_by;    -- never populated

-- calendar_events
alter table public.calendar_events
  drop column if exists attendees,         -- text[]; never populated
  drop column if exists recurrence_rule;   -- jsonb; never populated

-- project_calendars
alter table public.project_calendars
  drop column if exists is_shared;     -- never set true; sharing is driven by share_token presence

-- ---------------------------------------------------------------------------
-- 3) Drop tables that exist remotely but no service-layer code touches.
--    All three returned 0 rows in production. Order matters: `events` has an
--    FK into `calendars`, so drop the child first.
-- ---------------------------------------------------------------------------
drop table if exists public.events;
drop table if exists public.calendars;
drop table if exists public.documents;
