-- Migration: project_timesheet_template
-- Adds the per-project choice of printed timesheet form. Every timesheet
-- belonging to the project is exported with the selected template.
-- Existing rows default to 'default' (the original Stundenzettel), so no
-- project changes its output unless a user explicitly switches it.

-- ── UP ──────────────────────────────────────────────────────────────────────

ALTER TABLE "public"."projects"
  ADD COLUMN "timesheet_template" "text" NOT NULL DEFAULT 'default';

ALTER TABLE "public"."projects"
  ADD CONSTRAINT "projects_timesheet_template_check"
    CHECK ("timesheet_template" IN ('default', 'wbfilm'));

COMMENT ON COLUMN "public"."projects"."timesheet_template" IS
  'Printed timesheet form used for this project''s timesheets. Values map to the template registry in lib/timesheets/print/templates.ts.';

-- ── DOWN (run manually to reverse) ──────────────────────────────────────────
-- ALTER TABLE public.projects DROP CONSTRAINT projects_timesheet_template_check;
-- ALTER TABLE public.projects DROP COLUMN timesheet_template;
