-- ============================================================
-- Migration 2026-03-19 — CrewBooklet feature additions
-- Run in Supabase Dashboard → SQL Editor
-- Safe to re-run (uses IF NOT EXISTS / DO blocks)
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. organizations — add website column (from 2026-03-18 note)
-- ────────────────────────────────────────────────────────────

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS website TEXT;


-- ────────────────────────────────────────────────────────────
-- 2. project_assignments — notes column
--    Was in the TypeScript model but may not exist in DB yet.
-- ────────────────────────────────────────────────────────────

ALTER TABLE project_assignments
  ADD COLUMN IF NOT EXISTS notes TEXT;


-- ────────────────────────────────────────────────────────────
-- 3. project_assignments — make person_id nullable
--    Required so org-only assignments can be stored.
-- ────────────────────────────────────────────────────────────

ALTER TABLE project_assignments
  ALTER COLUMN person_id DROP NOT NULL;


-- ────────────────────────────────────────────────────────────
-- 4. project_assignments — add organization_id FK
-- ────────────────────────────────────────────────────────────

ALTER TABLE project_assignments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;


-- ────────────────────────────────────────────────────────────
-- 5. project_assignments — data integrity constraint
--    Each row must have at least one of person_id or organization_id.
--    Drop first in case we're re-running after a failed attempt.
-- ────────────────────────────────────────────────────────────

ALTER TABLE project_assignments
  DROP CONSTRAINT IF EXISTS chk_assignment_has_entity;

ALTER TABLE project_assignments
  ADD CONSTRAINT chk_assignment_has_entity
  CHECK (person_id IS NOT NULL OR organization_id IS NOT NULL);


-- ────────────────────────────────────────────────────────────
-- 6. RLS policies for project_assignments
--    Org-linked assignments inherit the same user_id-based rules.
--    If you have custom policies, review them below.
-- ────────────────────────────────────────────────────────────

-- Show current policies so you can review them:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'project_assignments';

-- The standard RLS pattern used in this project is:
--   user_id = auth.uid()
-- That still works because we set user_id on insert.
-- No policy changes needed unless you have custom restrictions.


-- ────────────────────────────────────────────────────────────
-- 7. Indexes for the new FK (improves query performance)
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_project_assignments_organization_id
  ON project_assignments(organization_id);

CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id
  ON project_assignments(project_id);

CREATE INDEX IF NOT EXISTS idx_project_assignments_person_id
  ON project_assignments(person_id);


-- ────────────────────────────────────────────────────────────
-- 8. Verify the full schema of related tables
-- ────────────────────────────────────────────────────────────

-- Run these SELECT statements one at a time to verify structure:

-- All columns in project_assignments:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'project_assignments'
ORDER BY ordinal_position;

-- All columns in organizations (check website is there):
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'organizations'
ORDER BY ordinal_position;

-- Foreign keys on project_assignments:
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'project_assignments';


-- ────────────────────────────────────────────────────────────
-- 9. Connectivity health check — counts of connected data
-- ────────────────────────────────────────────────────────────

SELECT
  'People with org'              AS metric, COUNT(*) AS count FROM people   WHERE organization_id IS NOT NULL
UNION ALL
SELECT
  'People without org',                      COUNT(*)          FROM people   WHERE organization_id IS NULL
UNION ALL
SELECT
  'Projects with client org',                COUNT(*)          FROM projects WHERE client_organization_id IS NOT NULL
UNION ALL
SELECT
  'Projects without client org',             COUNT(*)          FROM projects WHERE client_organization_id IS NULL
UNION ALL
SELECT
  'Assignments — person only',               COUNT(*)          FROM project_assignments WHERE person_id IS NOT NULL AND organization_id IS NULL
UNION ALL
SELECT
  'Assignments — org only',                  COUNT(*)          FROM project_assignments WHERE organization_id IS NOT NULL AND person_id IS NULL
UNION ALL
SELECT
  'Assignments — both (unexpected)',         COUNT(*)          FROM project_assignments WHERE person_id IS NOT NULL AND organization_id IS NOT NULL
UNION ALL
SELECT
  'Assignments — neither (constraint err)',  COUNT(*)          FROM project_assignments WHERE person_id IS NULL AND organization_id IS NULL;


-- ────────────────────────────────────────────────────────────
-- 10. Dangling reference check — catch broken FKs in existing data
-- ────────────────────────────────────────────────────────────

-- People linked to a non-existent org:
SELECT p.id, p.name, p.organization_id
FROM people p
WHERE p.organization_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = p.organization_id);

-- Projects linked to a non-existent org:
SELECT pr.id, pr.name, pr.client_organization_id
FROM projects pr
WHERE pr.client_organization_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = pr.client_organization_id);

-- Assignments with a missing person:
SELECT pa.id, pa.project_id, pa.person_id
FROM project_assignments pa
WHERE pa.person_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM people p WHERE p.id = pa.person_id);

-- Assignments with a missing project:
SELECT pa.id, pa.person_id, pa.project_id
FROM project_assignments pa
WHERE NOT EXISTS (SELECT 1 FROM projects pr WHERE pr.id = pa.project_id);
