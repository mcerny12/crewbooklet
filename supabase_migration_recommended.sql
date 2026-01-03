-- =====================================================
-- CrewBooklet: Recommended Supabase Migration
-- Date: 2026-01-03
-- Purpose: Fix all warnings + prepare for scalable multi-user access
-- Approach: Clean, efficient, future-proof
-- =====================================================

-- =====================================================
-- PHASE 1: IMMEDIATE FIXES (Safe - Zero Risk)
-- =====================================================

-- 1.1: Remove duplicate indexes
DROP INDEX IF EXISTS idx_assignments_person;
DROP INDEX IF EXISTS idx_assignments_project;

-- =====================================================
-- PHASE 2: ADD USER TRACKING (Prepare for multi-user)
-- =====================================================

-- 2.1: Add user_id to track ownership
-- Note: Since this is early development, setting existing rows to NULL is fine
--       You can manually set them after running the migration
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE people ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE project_assignments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2.2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_user_id ON organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_people_user_id ON people(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_user_id ON project_assignments(user_id);

-- 2.3: Create user_profiles table for role management
-- Note: Cannot modify auth.users directly (managed by Supabase)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "user_profiles_select_own" ON user_profiles
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = id);

-- Users can insert their own profile (for signup)
CREATE POLICY "user_profiles_insert_own" ON user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = id);

-- 2.4: Create user profiles for existing users (make first user admin)
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Get the first user (you, presumably)
    SELECT id INTO first_user_id
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1;

    -- Create profile for first user as admin
    IF first_user_id IS NOT NULL THEN
        INSERT INTO user_profiles (id, role)
        VALUES (first_user_id, 'admin')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Create profiles for any other existing users
    INSERT INTO user_profiles (id, role)
    SELECT id, 'user'
    FROM auth.users
    WHERE id NOT IN (SELECT id FROM user_profiles)
    ON CONFLICT (id) DO NOTHING;
END $$;

-- =====================================================
-- PHASE 3: CLEAN UP OLD POLICIES
-- =====================================================

-- 3.1: Drop all existing conflicting policies

-- Organizations
DROP POLICY IF EXISTS "Enable read access for all users" ON organizations;
DROP POLICY IF EXISTS "Public can read organizations" ON organizations;
DROP POLICY IF EXISTS "Public can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Public can update organizations" ON organizations;
DROP POLICY IF EXISTS "Public can delete organizations" ON organizations;
DROP POLICY IF EXISTS "Users can manage their own organizations" ON organizations;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON organizations;

-- People
DROP POLICY IF EXISTS "Enable read access for all users" ON people;
DROP POLICY IF EXISTS "Public can read people" ON people;
DROP POLICY IF EXISTS "Public can insert people" ON people;
DROP POLICY IF EXISTS "Public can update people" ON people;
DROP POLICY IF EXISTS "Public can delete people" ON people;
DROP POLICY IF EXISTS "Users can manage their own people" ON people;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON people;

-- Projects
DROP POLICY IF EXISTS "Enable read access for all users" ON projects;
DROP POLICY IF EXISTS "Public can read projects" ON projects;
DROP POLICY IF EXISTS "Public can insert projects" ON projects;
DROP POLICY IF EXISTS "Public can update projects" ON projects;
DROP POLICY IF EXISTS "Public can delete projects" ON projects;
DROP POLICY IF EXISTS "Users can manage their own projects" ON projects;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON projects;

-- Project Assignments
DROP POLICY IF EXISTS "Enable read access for all users" ON project_assignments;
DROP POLICY IF EXISTS "Public can read project_assignments" ON project_assignments;
DROP POLICY IF EXISTS "Public can insert project_assignments" ON project_assignments;
DROP POLICY IF EXISTS "Public can update project_assignments" ON project_assignments;
DROP POLICY IF EXISTS "Public can delete project_assignments" ON project_assignments;
DROP POLICY IF EXISTS "Users can manage project assignments" ON project_assignments;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON project_assignments;

-- =====================================================
-- PHASE 4: CREATE CLEAN, SCALABLE POLICIES
-- =====================================================
-- Strategy: Authenticated users only, user-scoped data
-- Future: Easy to add admin override or shared data access

-- 4.1: Helper function for checking if user is admin (future use)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user has admin role in user_profiles
    RETURN EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.2: Organizations policies (optimized with SELECT wrapper)
CREATE POLICY "organizations_select" ON organizations
    FOR SELECT
    TO authenticated
    USING (
        (SELECT auth.uid()) = user_id  -- Own data
        OR is_admin()                   -- Or admin (future)
    );

CREATE POLICY "organizations_insert" ON organizations
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "organizations_update" ON organizations
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id OR is_admin())
    WITH CHECK ((SELECT auth.uid()) = user_id OR is_admin());

CREATE POLICY "organizations_delete" ON organizations
    FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id OR is_admin());

-- 4.3: People policies
CREATE POLICY "people_select" ON people
    FOR SELECT
    TO authenticated
    USING (
        (SELECT auth.uid()) = user_id
        OR is_admin()
    );

CREATE POLICY "people_insert" ON people
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "people_update" ON people
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id OR is_admin())
    WITH CHECK ((SELECT auth.uid()) = user_id OR is_admin());

CREATE POLICY "people_delete" ON people
    FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id OR is_admin());

-- 4.4: Projects policies
CREATE POLICY "projects_select" ON projects
    FOR SELECT
    TO authenticated
    USING (
        (SELECT auth.uid()) = user_id
        OR is_admin()
    );

CREATE POLICY "projects_insert" ON projects
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "projects_update" ON projects
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id OR is_admin())
    WITH CHECK ((SELECT auth.uid()) = user_id OR is_admin());

CREATE POLICY "projects_delete" ON projects
    FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id OR is_admin());

-- 4.5: Project Assignments policies
CREATE POLICY "project_assignments_select" ON project_assignments
    FOR SELECT
    TO authenticated
    USING (
        (SELECT auth.uid()) = user_id
        OR is_admin()
    );

CREATE POLICY "project_assignments_insert" ON project_assignments
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "project_assignments_update" ON project_assignments
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id OR is_admin())
    WITH CHECK ((SELECT auth.uid()) = user_id OR is_admin());

CREATE POLICY "project_assignments_delete" ON project_assignments
    FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id OR is_admin());

-- =====================================================
-- PHASE 5: FIX CALENDAR/EVENT POLICIES (if tables exist)
-- =====================================================
-- Check if you have 'calendars' and 'events' tables (renamed from project_calendars/calendar_events)
-- If so, apply similar policies

-- For project_calendars/calendars
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_calendars') THEN
        -- Add user_id if missing
        ALTER TABLE project_calendars ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_project_calendars_user_id ON project_calendars(user_id);

        -- Drop old policies
        DROP POLICY IF EXISTS "Enable read access for authenticated users" ON project_calendars;
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON project_calendars;
        DROP POLICY IF EXISTS "Enable update for authenticated users" ON project_calendars;
        DROP POLICY IF EXISTS "Enable delete for authenticated users" ON project_calendars;
        DROP POLICY IF EXISTS "Calendars rw" ON project_calendars;

        -- Create optimized policies
        EXECUTE 'CREATE POLICY "calendars_select" ON project_calendars FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id OR is_admin())';
        EXECUTE 'CREATE POLICY "calendars_insert" ON project_calendars FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id)';
        EXECUTE 'CREATE POLICY "calendars_update" ON project_calendars FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id OR is_admin()) WITH CHECK ((SELECT auth.uid()) = user_id OR is_admin())';
        EXECUTE 'CREATE POLICY "calendars_delete" ON project_calendars FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id OR is_admin())';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
        -- Add user_id if missing
        ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);

        -- Drop old policies
        DROP POLICY IF EXISTS "Enable read access for authenticated users" ON calendar_events;
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON calendar_events;
        DROP POLICY IF EXISTS "Enable update for authenticated users" ON calendar_events;
        DROP POLICY IF EXISTS "Enable delete for authenticated users" ON calendar_events;
        DROP POLICY IF EXISTS "Events rw" ON calendar_events;

        -- Create optimized policies
        EXECUTE 'CREATE POLICY "events_select" ON calendar_events FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id OR is_admin())';
        EXECUTE 'CREATE POLICY "events_insert" ON calendar_events FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id)';
        EXECUTE 'CREATE POLICY "events_update" ON calendar_events FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id OR is_admin()) WITH CHECK ((SELECT auth.uid()) = user_id OR is_admin())';
        EXECUTE 'CREATE POLICY "events_delete" ON calendar_events FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id OR is_admin())';
    END IF;
END $$;

-- =====================================================
-- PHASE 6: DOCUMENTS TABLE (if exists)
-- =====================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
        -- Add user_id if missing
        ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);

        -- Drop old policies
        DROP POLICY IF EXISTS "Users can view documents" ON documents;
        DROP POLICY IF EXISTS "Users can insert documents" ON documents;
        DROP POLICY IF EXISTS "Users can update documents" ON documents;
        DROP POLICY IF EXISTS "Users can delete documents" ON documents;

        -- Create optimized policies
        EXECUTE 'CREATE POLICY "documents_select" ON documents FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id OR is_admin())';
        EXECUTE 'CREATE POLICY "documents_insert" ON documents FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id)';
        EXECUTE 'CREATE POLICY "documents_update" ON documents FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id OR is_admin()) WITH CHECK ((SELECT auth.uid()) = user_id OR is_admin())';
        EXECUTE 'CREATE POLICY "documents_delete" ON documents FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id OR is_admin())';
    END IF;
END $$;

-- =====================================================
-- PHASE 7: SET FIRST USER AS OWNER OF EXISTING DATA
-- =====================================================
-- Automatically assign all existing data to the first user (admin)
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the admin user (first user created)
    SELECT id INTO admin_user_id
    FROM user_profiles
    WHERE role = 'admin'
    ORDER BY created_at ASC
    LIMIT 1;

    -- Assign ownership of all existing data
    IF admin_user_id IS NOT NULL THEN
        UPDATE organizations SET user_id = admin_user_id WHERE user_id IS NULL;
        UPDATE people SET user_id = admin_user_id WHERE user_id IS NULL;
        UPDATE projects SET user_id = admin_user_id WHERE user_id IS NULL;
        UPDATE project_assignments SET user_id = admin_user_id WHERE user_id IS NULL;

        -- Handle calendar tables if they exist
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_calendars') THEN
            EXECUTE 'UPDATE project_calendars SET user_id = $1 WHERE user_id IS NULL' USING admin_user_id;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
            EXECUTE 'UPDATE calendar_events SET user_id = $1 WHERE user_id IS NULL' USING admin_user_id;
        END IF;

        -- Handle documents table if it exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
            EXECUTE 'UPDATE documents SET user_id = $1 WHERE user_id IS NULL' USING admin_user_id;
        END IF;
    END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check policy count (should have exactly 4 policies per table: select, insert, update, delete)
SELECT
    tablename,
    COUNT(*) as policy_count,
    array_agg(policyname ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('organizations', 'people', 'projects', 'project_assignments')
GROUP BY tablename
ORDER BY tablename;

-- Check for any remaining auth function calls without SELECT wrapper
SELECT
    tablename,
    policyname,
    qual::text as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual::text LIKE '%auth.uid()%'
    OR qual::text LIKE '%auth.role()%'
  )
  AND qual::text NOT LIKE '%(SELECT auth.%';

-- This should return 0 rows

-- Verify indexes
SELECT
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('organizations', 'people', 'projects', 'project_assignments')
ORDER BY tablename, indexname;
