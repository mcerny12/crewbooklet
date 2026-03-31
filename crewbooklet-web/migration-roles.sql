-- ============================================================
-- Migration: Role-based access control
-- Run in Supabase Dashboard → SQL Editor
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. user_roles table
--    Mirrors the role stored in auth.users user_metadata.
--    Having it in a proper table lets RLS policies join against it
--    without needing custom JWT claims.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_roles (
  user_id  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role     TEXT NOT NULL DEFAULT 'user'
             CHECK (role IN ('admin', 'user', 'viewer')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Users can read their own role (used by the app to double-check)
DROP POLICY IF EXISTS "users_read_own_role" ON user_roles;
CREATE POLICY "users_read_own_role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Only the service-role key (admin API) can insert / update / delete roles.
-- No permissive policies for INSERT/UPDATE/DELETE means RLS blocks them for
-- normal authenticated requests — the admin Next.js API route uses the
-- service role key which bypasses RLS entirely.


-- ────────────────────────────────────────────────────────────
-- 2. Helper function — get the current user's role
--    Returns 'user' if no row exists yet (safe default).
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT role FROM user_roles WHERE user_id = auth.uid()),
    'user'
  );
$$;


-- ────────────────────────────────────────────────────────────
-- 3. Update data-table RLS policies to enforce viewer read-only
--
--    Current model: each user sees only their own records
--    (user_id = auth.uid()).  We keep that for admin/user roles
--    and add a read-only path for viewers.
--
--    Run these for each table that needs role-aware policies.
--    Tables covered: people, organizations, projects,
--    project_assignments, invoices, invoice_items,
--    invoice_attachments, project_calendars, calendar_events
-- ────────────────────────────────────────────────────────────

-- ── people ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "viewer_select_people" ON people;
CREATE POLICY "viewer_select_people" ON people
  FOR SELECT
  USING (
    -- owners see their own records
    auth.uid() = user_id
    OR
    -- viewers can read all records (read-only access for shared workspace)
    get_my_role() = 'viewer'
  );

DROP POLICY IF EXISTS "writer_insert_people" ON people;
CREATE POLICY "writer_insert_people" ON people
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND get_my_role() <> 'viewer');

DROP POLICY IF EXISTS "writer_update_people" ON people;
CREATE POLICY "writer_update_people" ON people
  FOR UPDATE
  USING (auth.uid() = user_id AND get_my_role() <> 'viewer');

DROP POLICY IF EXISTS "writer_delete_people" ON people;
CREATE POLICY "writer_delete_people" ON people
  FOR DELETE
  USING (auth.uid() = user_id AND get_my_role() <> 'viewer');


-- ── organizations ────────────────────────────────────────────
DROP POLICY IF EXISTS "viewer_select_organizations" ON organizations;
CREATE POLICY "viewer_select_organizations" ON organizations
  FOR SELECT
  USING (auth.uid() = user_id OR get_my_role() = 'viewer');

DROP POLICY IF EXISTS "writer_insert_organizations" ON organizations;
CREATE POLICY "writer_insert_organizations" ON organizations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND get_my_role() <> 'viewer');

DROP POLICY IF EXISTS "writer_update_organizations" ON organizations;
CREATE POLICY "writer_update_organizations" ON organizations
  FOR UPDATE
  USING (auth.uid() = user_id AND get_my_role() <> 'viewer');

DROP POLICY IF EXISTS "writer_delete_organizations" ON organizations;
CREATE POLICY "writer_delete_organizations" ON organizations
  FOR DELETE
  USING (auth.uid() = user_id AND get_my_role() <> 'viewer');


-- ── projects ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "viewer_select_projects" ON projects;
CREATE POLICY "viewer_select_projects" ON projects
  FOR SELECT
  USING (auth.uid() = user_id OR get_my_role() = 'viewer');

DROP POLICY IF EXISTS "writer_insert_projects" ON projects;
CREATE POLICY "writer_insert_projects" ON projects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND get_my_role() <> 'viewer');

DROP POLICY IF EXISTS "writer_update_projects" ON projects;
CREATE POLICY "writer_update_projects" ON projects
  FOR UPDATE
  USING (auth.uid() = user_id AND get_my_role() <> 'viewer');

DROP POLICY IF EXISTS "writer_delete_projects" ON projects;
CREATE POLICY "writer_delete_projects" ON projects
  FOR DELETE
  USING (auth.uid() = user_id AND get_my_role() <> 'viewer');


-- ── project_assignments ──────────────────────────────────────
DROP POLICY IF EXISTS "viewer_select_project_assignments" ON project_assignments;
CREATE POLICY "viewer_select_project_assignments" ON project_assignments
  FOR SELECT
  USING (auth.uid() = user_id OR get_my_role() = 'viewer');

DROP POLICY IF EXISTS "writer_insert_project_assignments" ON project_assignments;
CREATE POLICY "writer_insert_project_assignments" ON project_assignments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND get_my_role() <> 'viewer');

DROP POLICY IF EXISTS "writer_update_project_assignments" ON project_assignments;
CREATE POLICY "writer_update_project_assignments" ON project_assignments
  FOR UPDATE
  USING (auth.uid() = user_id AND get_my_role() <> 'viewer');

DROP POLICY IF EXISTS "writer_delete_project_assignments" ON project_assignments;
CREATE POLICY "writer_delete_project_assignments" ON project_assignments
  FOR DELETE
  USING (auth.uid() = user_id AND get_my_role() <> 'viewer');


-- ── invoices ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "viewer_select_invoices" ON invoices;
CREATE POLICY "viewer_select_invoices" ON invoices
  FOR SELECT
  USING (auth.uid() = user_id OR get_my_role() = 'viewer');

DROP POLICY IF EXISTS "writer_insert_invoices" ON invoices;
CREATE POLICY "writer_insert_invoices" ON invoices
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND get_my_role() <> 'viewer');

DROP POLICY IF EXISTS "writer_update_invoices" ON invoices;
CREATE POLICY "writer_update_invoices" ON invoices
  FOR UPDATE
  USING (auth.uid() = user_id AND get_my_role() <> 'viewer');

DROP POLICY IF EXISTS "writer_delete_invoices" ON invoices;
CREATE POLICY "writer_delete_invoices" ON invoices
  FOR DELETE
  USING (auth.uid() = user_id AND get_my_role() <> 'viewer');


-- ── invoice_items ────────────────────────────────────────────
DROP POLICY IF EXISTS "viewer_select_invoice_items" ON invoice_items;
CREATE POLICY "viewer_select_invoice_items" ON invoice_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
        AND (invoices.user_id = auth.uid() OR get_my_role() = 'viewer')
    )
  );

DROP POLICY IF EXISTS "writer_insert_invoice_items" ON invoice_items;
CREATE POLICY "writer_insert_invoice_items" ON invoice_items
  FOR INSERT
  WITH CHECK (
    get_my_role() <> 'viewer' AND
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_id AND invoices.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "writer_update_invoice_items" ON invoice_items;
CREATE POLICY "writer_update_invoice_items" ON invoice_items
  FOR UPDATE
  USING (
    get_my_role() <> 'viewer' AND
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_id AND invoices.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "writer_delete_invoice_items" ON invoice_items;
CREATE POLICY "writer_delete_invoice_items" ON invoice_items
  FOR DELETE
  USING (
    get_my_role() <> 'viewer' AND
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_id AND invoices.user_id = auth.uid())
  );


-- ── calendar_events / project_calendars ─────────────────────
-- (add if those tables exist in your schema)
-- Pattern is identical: SELECT open to owners + viewers,
-- INSERT/UPDATE/DELETE blocked for viewers.


-- ────────────────────────────────────────────────────────────
-- 4. Seed user_roles from current auth.users metadata
--    Run once after creating the table to back-fill existing users.
-- ────────────────────────────────────────────────────────────

INSERT INTO user_roles (user_id, role)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'role', 'user')
FROM auth.users
ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role,
      updated_at = NOW();
