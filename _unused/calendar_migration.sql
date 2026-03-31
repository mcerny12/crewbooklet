-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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