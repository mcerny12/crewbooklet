-- Migration: Add relationship support
-- Description: Adds indexes, constraints, and helper functions for relationship queries
-- Date: 2025-01-25

-- Step 1: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_client_organization_id ON projects(client_organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_organization_ids ON projects USING GIN (organization_ids);
CREATE INDEX IF NOT EXISTS idx_project_assignments_person_id ON project_assignments(person_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_people_organization_id ON people(organization_id);

-- Step 2: Add foreign key constraint if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_organization'
    ) THEN
        ALTER TABLE people 
        ADD CONSTRAINT fk_organization 
        FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Step 3: Add RLS policies (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'projects' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON projects FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'project_assignments' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON project_assignments FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'people' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON people FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organizations' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON organizations FOR SELECT USING (true);
    END IF;
END $$;

-- Step 4: Add helper functions with proper table aliases
CREATE OR REPLACE FUNCTION get_projects_for_person(person_id UUID)
RETURNS SETOF projects AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.*
    FROM projects p
    INNER JOIN project_assignments pa ON pa.project_id = p.id
    WHERE pa.person_id = get_projects_for_person.person_id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_projects_for_organization(org_id UUID)
RETURNS SETOF projects AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.*
    FROM projects p
    WHERE p.client_organization_id = get_projects_for_organization.org_id
    OR get_projects_for_organization.org_id = ANY(p.organization_ids)
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_people_for_project(project_id UUID)
RETURNS TABLE (
    person_id UUID,
    person_data jsonb,
    assignment_data jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as person_id,
        row_to_json(p.*)::jsonb as person_data,
        row_to_json(pa.*)::jsonb as assignment_data
    FROM people p
    INNER JOIN project_assignments pa ON pa.person_id = p.id
    WHERE pa.project_id = get_people_for_project.project_id
    ORDER BY p.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Grant execute permissions
GRANT EXECUTE ON FUNCTION get_projects_for_person(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_projects_for_organization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_people_for_project(UUID) TO authenticated;

-- Verification queries (optional, comment out in production)
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('projects', 'project_assignments', 'people');
-- SELECT * FROM pg_policies WHERE tablename IN ('projects', 'project_assignments', 'people', 'organizations');
-- SELECT proname, prosrc FROM pg_proc WHERE proname IN ('get_projects_for_person', 'get_projects_for_organization', 'get_people_for_project'); 