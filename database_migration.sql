-- =====================================================
-- CrewBooklet Database Migration - Add Missing Fields
-- Date: 2025-01-20
-- Purpose: Add missing fields to organizations and projects tables
-- =====================================================

-- Add missing fields to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address JSONB;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS jobs JSONB DEFAULT '[]'::jsonb;

-- Add missing fields to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget DECIMAL(12,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for performance on new fields
CREATE INDEX IF NOT EXISTS idx_organizations_contact_email ON organizations(contact_email);
CREATE INDEX IF NOT EXISTS idx_organizations_contact_phone ON organizations(contact_phone);
CREATE INDEX IF NOT EXISTS idx_organizations_address_gin ON organizations USING gin (address);
CREATE INDEX IF NOT EXISTS idx_organizations_address_city ON organizations USING gin ((address->>'city'));
CREATE INDEX IF NOT EXISTS idx_organizations_jobs_gin ON organizations USING gin (jobs);

CREATE INDEX IF NOT EXISTS idx_projects_budget ON projects(budget);
CREATE INDEX IF NOT EXISTS idx_projects_start_date ON projects(start_date);
CREATE INDEX IF NOT EXISTS idx_projects_end_date ON projects(end_date);

-- Add comments for documentation
COMMENT ON COLUMN organizations.contact_email IS 'Primary contact email for the organization';
COMMENT ON COLUMN organizations.contact_phone IS 'Primary contact phone number for the organization';
COMMENT ON COLUMN organizations.address IS 'Structured address with street1, street2, zip, city, country';
COMMENT ON COLUMN organizations.notes IS 'Additional notes and information about the organization';
COMMENT ON COLUMN organizations.jobs IS 'Array of organization job types (Agentur, Filmproduktion, Technikverleih, etc.)';

COMMENT ON COLUMN projects.budget IS 'Project budget amount';
COMMENT ON COLUMN projects.start_date IS 'Project start date';
COMMENT ON COLUMN projects.end_date IS 'Project end date';
COMMENT ON COLUMN projects.notes IS 'Additional project notes and information';

-- Update RLS policies to include new fields (if needed)
-- The existing policies should already cover these new fields since they use "FOR ALL"

-- Calendar Tables
CREATE TABLE project_calendars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#007AFF',
    is_visible BOOLEAN NOT NULL DEFAULT true,
    is_shared BOOLEAN NOT NULL DEFAULT false,
    last_modified TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    calendar_id UUID NOT NULL REFERENCES project_calendars(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_all_day BOOLEAN NOT NULL DEFAULT false,
    location VARCHAR(255),
    notes TEXT,
    attendees TEXT[],
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    recurrence_rule JSONB,
    last_modified TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_project_calendars_project_id ON project_calendars(project_id);
CREATE INDEX idx_calendar_events_calendar_id ON calendar_events(calendar_id);
CREATE INDEX idx_calendar_events_start_date ON calendar_events(start_date);
CREATE INDEX idx_calendar_events_end_date ON calendar_events(end_date);

-- Trigger to update last_modified and updated_at
CREATE OR REPLACE FUNCTION update_calendar_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_modified = CURRENT_TIMESTAMP;
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_calendar_timestamps
    BEFORE UPDATE ON project_calendars
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_timestamps();

CREATE TRIGGER update_calendar_event_timestamps
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_timestamps();

-- RLS Policies for project_calendars
ALTER TABLE project_calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON project_calendars
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for authenticated users" ON project_calendars
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON project_calendars
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON project_calendars
    FOR DELETE
    TO authenticated
    USING (true);

-- RLS Policies for calendar_events
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON calendar_events
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for authenticated users" ON calendar_events
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON calendar_events
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON calendar_events
    FOR DELETE
    TO authenticated
    USING (true);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'CrewBooklet database migration completed successfully!';
    RAISE NOTICE 'Added fields to organizations: contact_email, contact_phone, address, notes, jobs';
    RAISE NOTICE 'Added fields to projects: budget, start_date, end_date, notes';
    RAISE NOTICE 'Created performance indexes for all new fields';
END $$; 