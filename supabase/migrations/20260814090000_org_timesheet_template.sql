-- Migration: org_timesheet_template
-- Moves the printed timesheet form to a two-level model:
--   organizations.timesheet_template  = the client's default form
--   projects.timesheet_template       = optional per-project override
-- Resolution at export time is project ?? client organization ?? 'default'
-- (see resolveTimesheetTemplate in lib/timesheets/types.ts).
--
-- projects.timesheet_template therefore has to become NULLable: NULL now means
-- "inherit from the client organization", which is distinct from an explicit
-- 'default'. The values written by 20260814000000 were the column default
-- rather than user choices — no UI existed to set them between the two
-- migrations — so they are reset to NULL to make every project inherit.

-- ── UP ──────────────────────────────────────────────────────────────────────

ALTER TABLE "public"."projects"
  ALTER COLUMN "timesheet_template" DROP NOT NULL,
  ALTER COLUMN "timesheet_template" DROP DEFAULT;

UPDATE "public"."projects"
  SET "timesheet_template" = NULL
  WHERE "timesheet_template" = 'default';

COMMENT ON COLUMN "public"."projects"."timesheet_template" IS
  'Per-project override of the printed timesheet form. NULL = inherit from the client organization, which itself falls back to ''default''.';

ALTER TABLE "public"."organizations"
  ADD COLUMN "timesheet_template" "text";

ALTER TABLE "public"."organizations"
  ADD CONSTRAINT "organizations_timesheet_template_check"
    CHECK ("timesheet_template" IS NULL OR "timesheet_template" IN ('default', 'wbfilm'));

COMMENT ON COLUMN "public"."organizations"."timesheet_template" IS
  'Default printed timesheet form for this client''s projects. NULL = no preference (falls back to ''default''). Values map to the template registry in lib/timesheets/print/templates.ts.';

-- ── DOWN (run manually to reverse) ──────────────────────────────────────────
-- ALTER TABLE public.organizations DROP CONSTRAINT organizations_timesheet_template_check;
-- ALTER TABLE public.organizations DROP COLUMN timesheet_template;
-- UPDATE public.projects SET timesheet_template = 'default' WHERE timesheet_template IS NULL;
-- ALTER TABLE public.projects
--   ALTER COLUMN timesheet_template SET DEFAULT 'default',
--   ALTER COLUMN timesheet_template SET NOT NULL;
