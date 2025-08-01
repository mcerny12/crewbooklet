-- =====================================================
-- CrewBooklet Complete Database Schema - Supabase PostgreSQL
-- Date: 2025-01-20
-- Purpose: Complete fresh database setup with enhanced models
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- PEOPLE TABLE (Enhanced Person Model)
-- =====================================================
CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    notes TEXT,
    
    -- Enhanced fields from Phase 2
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    mobile_phone TEXT,
    work_phone TEXT,
    website TEXT,
    
    -- Organization connection
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- Complex data types (JSON)
    address JSONB,
    jobs JSONB DEFAULT '[]'::jsonb,
    languages JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PROJECTS TABLE
-- =====================================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ANFRAGE', 'BUDGET', 'PRODUKTION', 'ABGESAGT', 'HOLD')),
    creation_date TIMESTAMPTZ DEFAULT NOW(),
    inquiry_country TEXT,
    shooting_location TEXT,
    description TEXT,
    
    -- Relationships
    client_organization_id UUID,
    assigned_people JSONB DEFAULT '[]'::jsonb,
    organization_ids JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ORGANIZATIONS TABLE
-- =====================================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    address JSONB,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PROJECT ASSIGNMENTS TABLE (For crew-to-project relationships)
-- =====================================================
CREATE TABLE project_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    role TEXT, -- Specific position/role on THIS project (separate from person's general jobs/skills)
    department TEXT CHECK (department IN ('camera', 'lighting', 'grip', 'production', 'post', 'other')),
    
    -- Enhanced crew management fields
    availability TEXT NOT NULL DEFAULT 'Anfragen' CHECK (availability IN (
        'Anfragen', 'Angefragt', 'Verfügbar', 'Nicht Verfügbar', 
        '1. Option', '2. Option', 'Gebucht', 'Abgesagt', 'Keine Rückmeldung'
    )),
    daily_pay DECIMAL(10,2),
    currency TEXT DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'GBP')),
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate assignments
    UNIQUE(project_id, person_id)
);



-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- People table indexes
CREATE INDEX idx_people_name ON people(name);
CREATE INDEX idx_people_email ON people(email);
CREATE INDEX idx_people_created_at ON people(created_at);

-- JSON field indexes for people
CREATE INDEX idx_people_jobs_gin ON people USING gin (jobs);
CREATE INDEX idx_people_languages_gin ON people USING gin (languages);
CREATE INDEX idx_people_address_gin ON people USING gin (address);
CREATE INDEX idx_people_address_city ON people USING gin ((address->>'city'));

-- Projects table indexes
CREATE INDEX idx_projects_name ON projects(name);
CREATE INDEX idx_projects_number ON projects(project_number);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_creation_date ON projects(creation_date);
CREATE INDEX idx_projects_client_org ON projects(client_organization_id);

-- JSON field indexes for projects
CREATE INDEX idx_projects_assigned_people_gin ON projects USING gin (assigned_people);

-- Organizations table indexes
CREATE INDEX idx_organizations_name ON organizations(name);

-- Project assignments indexes
CREATE INDEX idx_assignments_project ON project_assignments(project_id);
CREATE INDEX idx_assignments_person ON project_assignments(person_id);
CREATE INDEX idx_assignments_department ON project_assignments(department);
CREATE INDEX idx_assignments_availability ON project_assignments(availability);
CREATE INDEX idx_assignments_role ON project_assignments(role);

-- Add indexes for project relationships
CREATE INDEX idx_projects_client_organization_id ON projects(client_organization_id);
CREATE INDEX idx_projects_organization_ids ON projects USING GIN (organization_ids);
CREATE INDEX idx_project_assignments_person_id ON project_assignments(person_id);
CREATE INDEX idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX idx_people_organization_id ON people(organization_id);

-- =====================================================
-- FUNCTIONS FOR AUTOMATIC TIMESTAMP UPDATES
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to all tables
CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON people 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON project_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust as needed)
CREATE POLICY "Enable all for authenticated users" ON people
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all for authenticated users" ON projects
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all for authenticated users" ON organizations
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all for authenticated users" ON project_assignments
    FOR ALL USING (auth.role() = 'authenticated');

-- Add RLS policies for accessing relationships
CREATE POLICY "Enable read access for all users" ON projects FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON project_assignments FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON people FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON organizations FOR SELECT USING (true);

-- =====================================================
-- FOREIGN KEY CONSTRAINTS
-- =====================================================
ALTER TABLE projects 
ADD CONSTRAINT fk_projects_client_organization 
FOREIGN KEY (client_organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE people 
ADD CONSTRAINT fk_organization 
FOREIGN KEY (organization_id) 
REFERENCES organizations(id) 
ON DELETE SET NULL;

-- =====================================================
-- SAMPLE DATA FOR TESTING (Optional - uncomment to use)
-- =====================================================

-- Sample organization
-- INSERT INTO organizations (name, contact_email, notes) VALUES 
-- ('Sample Production Company', 'contact@sample.com', 'Main client organization');

-- Sample person with enhanced fields
-- INSERT INTO people (
--     name, email, gender, mobile_phone, work_phone, website,
--     address, jobs, languages, notes
-- ) VALUES (
--     'John Director',
--     'john@example.com',
--     'male',
--     '+49-123-456789',
--     '+49-987-654321',
--     'https://johndirector.com',
--     '{"street1": "Filmstraße 123", "street2": "2. OG", "zip": "10115", "city": "Berlin", "country": "Deutschland"}'::jsonb,
--     '["director", "photographer"]'::jsonb,
--     '["EN", "DE", "FR"]'::jsonb,
--     'Experienced director with 10+ years in film industry'
-- );

-- Sample project
-- INSERT INTO projects (
--     project_number, name, status, inquiry_country, shooting_location, description
-- ) VALUES (
--     '2025-01',
--     'Sample Film Project',
--     'BUDGET',
--     'Deutschland',
--     'Berlin',
--     'Feature film production in Berlin'
-- );

-- =====================================================
-- HELPFUL QUERIES FOR DEVELOPMENT
-- =====================================================

-- Check schema
-- SELECT table_name, column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
-- ORDER BY table_name, ordinal_position;

-- Test JSON queries
-- SELECT * FROM people WHERE jobs ? 'director';
-- SELECT * FROM people WHERE languages ? 'EN';
-- SELECT * FROM people WHERE address->>'city' = 'Berlin';

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE people IS 'Enhanced crew members with comprehensive professional information';
COMMENT ON TABLE projects IS 'Film/video production projects with status tracking';
COMMENT ON TABLE organizations IS 'Client companies and production organizations';
COMMENT ON TABLE project_assignments IS 'Many-to-many relationship between people and projects';

COMMENT ON COLUMN people.gender IS 'Person gender: male, female, or other';
COMMENT ON COLUMN people.address IS 'Structured address with street1, street2, zip, city, country';
COMMENT ON COLUMN people.jobs IS 'Array of job types/professions from controlled list';
COMMENT ON COLUMN people.languages IS 'Array of language codes (EN, DE, FR, ES, IT)';
COMMENT ON COLUMN projects.project_number IS 'Auto-generated project number (YYYY-XX format)';
COMMENT ON COLUMN projects.assigned_people IS 'Array of person IDs assigned to this project';

-- Function to get all projects for a person
CREATE OR REPLACE FUNCTION get_projects_for_person(person_id UUID)
RETURNS SETOF projects AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.*
    FROM projects p
    INNER JOIN project_assignments pa ON pa.project_id = p.id
    WHERE pa.person_id = person_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all projects for an organization (both as client and involved)
CREATE OR REPLACE FUNCTION get_projects_for_organization(org_id UUID)
RETURNS SETOF projects AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.*
    FROM projects p
    WHERE p.client_organization_id = org_id
    OR org_id = ANY(p.organization_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all people for a project
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
    WHERE pa.project_id = project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add these functions to RLS
GRANT EXECUTE ON FUNCTION get_projects_for_person(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_projects_for_organization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_people_for_project(UUID) TO authenticated; 