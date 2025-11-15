-- =====================================================
-- CrewBooklet: German to English Translation Migration
-- Date: 2025-01-15
-- Purpose: Translate all German enum values and data to English
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: UPDATE PROJECT STATUS VALUES
-- =====================================================
-- Drop the old CHECK constraint
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- Update all existing project status values
UPDATE projects SET status = 'INQUIRY' WHERE status = 'ANFRAGE';
UPDATE projects SET status = 'PRODUCTION' WHERE status = 'PRODUKTION';
UPDATE projects SET status = 'COMPLETED' WHERE status = 'ABGESCHLOSSEN';
UPDATE projects SET status = 'CANCELLED' WHERE status = 'ABGESAGT';
-- BUDGET and HOLD remain the same

-- Add new CHECK constraint with English values
ALTER TABLE projects ADD CONSTRAINT projects_status_check
CHECK (status IN ('INQUIRY', 'BUDGET', 'PRODUCTION', 'COMPLETED', 'CANCELLED', 'HOLD'));

-- =====================================================
-- STEP 2: UPDATE ASSIGNMENT AVAILABILITY/STATUS VALUES
-- =====================================================
-- Drop the old CHECK constraint
ALTER TABLE project_assignments DROP CONSTRAINT IF EXISTS project_assignments_availability_check;

-- Update all existing assignment availability values
UPDATE project_assignments SET availability = 'To Inquire' WHERE availability = 'Anfragen';
UPDATE project_assignments SET availability = 'Inquired' WHERE availability = 'Angefragt';
UPDATE project_assignments SET availability = 'Available' WHERE availability = 'Verfügbar';
UPDATE project_assignments SET availability = 'Not Available' WHERE availability = 'Nicht Verfügbar';
UPDATE project_assignments SET availability = '1st Option' WHERE availability = '1. Option';
UPDATE project_assignments SET availability = '2nd Option' WHERE availability = '2. Option';
UPDATE project_assignments SET availability = 'Booked' WHERE availability = 'Gebucht';
UPDATE project_assignments SET availability = 'Cancelled' WHERE availability = 'Abgesagt';
UPDATE project_assignments SET availability = 'No Response' WHERE availability = 'Keine Rückmeldung';

-- Add new CHECK constraint with English values
ALTER TABLE project_assignments ADD CONSTRAINT project_assignments_availability_check
CHECK (availability IN (
    'To Inquire', 'Inquired', 'Available', 'Not Available',
    '1st Option', '2nd Option', 'Booked', 'Cancelled', 'No Response'
));

-- =====================================================
-- STEP 3: UPDATE ORGANIZATION JOB TYPES IN PEOPLE.JOBS (JSONB)
-- =====================================================
-- Update jobs array in people table (stored as JSONB array)
UPDATE people SET jobs = jsonb_agg(
    CASE elem::text
        WHEN '"Agentur"' THEN '"Agency"'
        WHEN '"Filmproduktion"' THEN '"Film Production"'
        WHEN '"Technikverleih"' THEN '"Equipment Rental"'
        WHEN '"Postproduktion"' THEN '"Post-Production"'
        WHEN '"Casting-Agentur"' THEN '"Casting Agency"'
        WHEN '"Location-Service"' THEN '"Location Service"'
        WHEN '"Catering-Service"' THEN '"Catering Service"'
        WHEN '"Transport-Service"' THEN '"Transport Service"'
        WHEN '"Sender/TV-Station"' THEN '"Broadcaster/TV Station"'
        WHEN '"Streaming-Plattform"' THEN '"Streaming Platform"'
        WHEN '"Verleih"' THEN '"Distribution Company"'
        WHEN '"Talent-Agentur"' THEN '"Talent Agency"'
        WHEN '"Musiklabel"' THEN '"Music Label"'
        WHEN '"Tonstudio"' THEN '"Sound Studio"'
        WHEN '"Schnittplatz"' THEN '"Editing Suite"'
        WHEN '"Color-Grading"' THEN '"Color Grading"'
        WHEN '"VFX-Studio"' THEN '"VFX Studio"'
        WHEN '"Animations-Studio"' THEN '"Animation Studio"'
        WHEN '"Sonstiges"' THEN '"Other"'
        ELSE elem::text
    END::jsonb
)
FROM (
    SELECT id, jsonb_array_elements(jobs) as elem
    FROM people
    WHERE jobs IS NOT NULL AND jsonb_array_length(jobs) > 0
) AS subquery
WHERE people.id = subquery.id
GROUP BY people.id;

-- =====================================================
-- STEP 4: UPDATE ORGANIZATION JOB TYPES (if stored in organizations table)
-- =====================================================
-- Check if organizations table has jobs field
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizations' AND column_name = 'jobs'
    ) THEN
        EXECUTE '
        UPDATE organizations SET jobs = jsonb_agg(
            CASE elem::text
                WHEN ''"Agentur"'' THEN ''"Agency"''
                WHEN ''"Filmproduktion"'' THEN ''"Film Production"''
                WHEN ''"Technikverleih"'' THEN ''"Equipment Rental"''
                WHEN ''"Postproduktion"'' THEN ''"Post-Production"''
                WHEN ''"Casting-Agentur"'' THEN ''"Casting Agency"''
                WHEN ''"Location-Service"'' THEN ''"Location Service"''
                WHEN ''"Catering-Service"'' THEN ''"Catering Service"''
                WHEN ''"Transport-Service"'' THEN ''"Transport Service"''
                WHEN ''"Sender/TV-Station"'' THEN ''"Broadcaster/TV Station"''
                WHEN ''"Streaming-Plattform"'' THEN ''"Streaming Platform"''
                WHEN ''"Verleih"'' THEN ''"Distribution Company"''
                WHEN ''"Talent-Agentur"'' THEN ''"Talent Agency"''
                WHEN ''"Musiklabel"'' THEN ''"Music Label"''
                WHEN ''"Tonstudio"'' THEN ''"Sound Studio"''
                WHEN ''"Schnittplatz"'' THEN ''"Editing Suite"''
                WHEN ''"Color-Grading"'' THEN ''"Color Grading"''
                WHEN ''"VFX-Studio"'' THEN ''"VFX Studio"''
                WHEN ''"Animations-Studio"'' THEN ''"Animation Studio"''
                WHEN ''"Sonstiges"'' THEN ''"Other"''
                ELSE elem::text
            END::jsonb
        )
        FROM (
            SELECT id, jsonb_array_elements(jobs) as elem
            FROM organizations
            WHERE jobs IS NOT NULL AND jsonb_array_length(jobs) > 0
        ) AS subquery
        WHERE organizations.id = subquery.id
        GROUP BY organizations.id;
        ';
    END IF;
END $$;

-- =====================================================
-- STEP 5: UPDATE COUNTRY NAMES IN ADDRESS FIELDS
-- =====================================================
-- Update country names in people.address JSONB field
UPDATE people
SET address = jsonb_set(
    address,
    '{country}',
    CASE address->>'country'
        WHEN 'Deutschland' THEN '"Germany"'
        WHEN 'Österreich' THEN '"Austria"'
        WHEN 'Schweiz' THEN '"Switzerland"'
        WHEN 'Frankreich' THEN '"France"'
        WHEN 'Italien' THEN '"Italy"'
        WHEN 'Spanien' THEN '"Spain"'
        WHEN 'Niederlande' THEN '"Netherlands"'
        WHEN 'Belgien' THEN '"Belgium"'
        WHEN 'Schweden' THEN '"Sweden"'
        WHEN 'Norwegen' THEN '"Norway"'
        WHEN 'Dänemark' THEN '"Denmark"'
        WHEN 'Polen' THEN '"Poland"'
        WHEN 'Tschechien' THEN '"Czech Republic"'
        WHEN 'Ungarn' THEN '"Hungary"'
        WHEN 'Australien' THEN '"Australia"'
        WHEN 'Neuseeland' THEN '"New Zealand"'
        WHEN 'Südkorea' THEN '"South Korea"'
        WHEN 'Singapur' THEN '"Singapore"'
        WHEN 'Hongkong' THEN '"Hong Kong"'
        WHEN 'VAE' THEN '"UAE"'
        WHEN 'Südafrika' THEN '"South Africa"'
        WHEN 'Marokko' THEN '"Morocco"'
        WHEN 'Türkei' THEN '"Turkey"'
        WHEN 'Griechenland' THEN '"Greece"'
        WHEN 'Irland' THEN '"Ireland"'
        WHEN 'Kroatien' THEN '"Croatia"'
        WHEN 'Slowenien' THEN '"Slovenia"'
        WHEN 'Rumänien' THEN '"Romania"'
        WHEN 'Bulgarien' THEN '"Bulgaria"'
        WHEN 'Kanada' THEN '"Canada"'
        WHEN 'Vereinigtes Königreich' THEN '"United Kingdom"'
        ELSE to_jsonb(address->>'country')
    END::jsonb
)
WHERE address IS NOT NULL
  AND address->>'country' IS NOT NULL;

-- Update country names in organizations.address JSONB field
UPDATE organizations
SET address = jsonb_set(
    address,
    '{country}',
    CASE address->>'country'
        WHEN 'Deutschland' THEN '"Germany"'
        WHEN 'Österreich' THEN '"Austria"'
        WHEN 'Schweiz' THEN '"Switzerland"'
        WHEN 'Frankreich' THEN '"France"'
        WHEN 'Italien' THEN '"Italy"'
        WHEN 'Spanien' THEN '"Spain"'
        WHEN 'Niederlande' THEN '"Netherlands"'
        WHEN 'Belgien' THEN '"Belgium"'
        WHEN 'Schweden' THEN '"Sweden"'
        WHEN 'Norwegen' THEN '"Norway"'
        WHEN 'Dänemark' THEN '"Denmark"'
        WHEN 'Polen' THEN '"Poland"'
        WHEN 'Tschechien' THEN '"Czech Republic"'
        WHEN 'Ungarn' THEN '"Hungary"'
        WHEN 'Australien' THEN '"Australia"'
        WHEN 'Neuseeland' THEN '"New Zealand"'
        WHEN 'Südkorea' THEN '"South Korea"'
        WHEN 'Singapur' THEN '"Singapore"'
        WHEN 'Hongkong' THEN '"Hong Kong"'
        WHEN 'VAE' THEN '"UAE"'
        WHEN 'Südafrika' THEN '"South Africa"'
        WHEN 'Marokko' THEN '"Morocco"'
        WHEN 'Türkei' THEN '"Turkey"'
        WHEN 'Griechenland' THEN '"Greece"'
        WHEN 'Irland' THEN '"Ireland"'
        WHEN 'Kroatien' THEN '"Croatia"'
        WHEN 'Slowenien' THEN '"Slovenia"'
        WHEN 'Rumänien' THEN '"Romania"'
        WHEN 'Bulgarien' THEN '"Bulgaria"'
        WHEN 'Kanada' THEN '"Canada"'
        WHEN 'Vereinigtes Königreich' THEN '"United Kingdom"'
        ELSE to_jsonb(address->>'country')
    END::jsonb
)
WHERE address IS NOT NULL
  AND address->>'country' IS NOT NULL;

-- =====================================================
-- STEP 6: UPDATE CITY NAMES IN ADDRESS FIELDS
-- =====================================================
-- Update German city names to English in people.address
UPDATE people
SET address = jsonb_set(
    address,
    '{city}',
    CASE address->>'city'
        WHEN 'München' THEN '"Munich"'
        WHEN 'Köln' THEN '"Cologne"'
        WHEN 'Nürnberg' THEN '"Nuremberg"'
        WHEN 'Wien' THEN '"Vienna"'
        WHEN 'Zürich' THEN '"Zurich"'
        WHEN 'Genève' THEN '"Geneva"'
        ELSE to_jsonb(address->>'city')
    END::jsonb
)
WHERE address IS NOT NULL
  AND address->>'city' IS NOT NULL
  AND address->>'city' IN ('München', 'Köln', 'Nürnberg', 'Wien', 'Zürich', 'Genève');

-- Update German city names to English in organizations.address
UPDATE organizations
SET address = jsonb_set(
    address,
    '{city}',
    CASE address->>'city'
        WHEN 'München' THEN '"Munich"'
        WHEN 'Köln' THEN '"Cologne"'
        WHEN 'Nürnberg' THEN '"Nuremberg"'
        WHEN 'Wien' THEN '"Vienna"'
        WHEN 'Zürich' THEN '"Zurich"'
        WHEN 'Genève' THEN '"Geneva"'
        ELSE to_jsonb(address->>'city')
    END::jsonb
)
WHERE address IS NOT NULL
  AND address->>'city' IS NOT NULL
  AND address->>'city' IN ('München', 'Köln', 'Nürnberg', 'Wien', 'Zürich', 'Genève');

-- =====================================================
-- STEP 7: UPDATE PROJECT LOCATION FIELDS
-- =====================================================
-- Update inquiry_country in projects
UPDATE projects
SET inquiry_country = CASE inquiry_country
    WHEN 'Deutschland' THEN 'Germany'
    WHEN 'Österreich' THEN 'Austria'
    WHEN 'Schweiz' THEN 'Switzerland'
    WHEN 'Frankreich' THEN 'France'
    WHEN 'Italien' THEN 'Italy'
    WHEN 'Spanien' THEN 'Spain'
    WHEN 'Niederlande' THEN 'Netherlands'
    WHEN 'Belgien' THEN 'Belgium'
    WHEN 'Schweden' THEN 'Sweden'
    WHEN 'Norwegen' THEN 'Norway'
    WHEN 'Dänemark' THEN 'Denmark'
    WHEN 'Polen' THEN 'Poland'
    WHEN 'Tschechien' THEN 'Czech Republic'
    WHEN 'Ungarn' THEN 'Hungary'
    WHEN 'Australien' THEN 'Australia'
    WHEN 'Neuseeland' THEN 'New Zealand'
    WHEN 'Südkorea' THEN 'South Korea'
    WHEN 'Singapur' THEN 'Singapore'
    WHEN 'Hongkong' THEN 'Hong Kong'
    WHEN 'VAE' THEN 'UAE'
    WHEN 'Südafrika' THEN 'South Africa'
    WHEN 'Marokko' THEN 'Morocco'
    WHEN 'Türkei' THEN 'Turkey'
    WHEN 'Griechenland' THEN 'Greece'
    WHEN 'Irland' THEN 'Ireland'
    WHEN 'Kroatien' THEN 'Croatia'
    WHEN 'Slowenien' THEN 'Slovenia'
    WHEN 'Rumänien' THEN 'Romania'
    WHEN 'Bulgarien' THEN 'Bulgaria'
    WHEN 'Kanada' THEN 'Canada'
    WHEN 'Vereinigtes Königreich' THEN 'United Kingdom'
    ELSE inquiry_country
END
WHERE inquiry_country IS NOT NULL;

-- =====================================================
-- STEP 8: DATA CLEANUP
-- =====================================================
-- Remove any orphaned project assignments (assignments with deleted people or projects)
DELETE FROM project_assignments
WHERE person_id NOT IN (SELECT id FROM people)
   OR project_id NOT IN (SELECT id FROM projects);

-- Remove any null or empty job entries
UPDATE people
SET jobs = '[]'::jsonb
WHERE jobs IS NULL OR jobs = 'null'::jsonb;

-- Remove any null or empty language entries
UPDATE people
SET languages = '[]'::jsonb
WHERE languages IS NULL OR languages = 'null'::jsonb;

-- Update any projects with NULL assigned_people to empty array
UPDATE projects
SET assigned_people = '[]'::jsonb
WHERE assigned_people IS NULL OR assigned_people = 'null'::jsonb;

-- Update any projects with NULL organization_ids to empty array
UPDATE projects
SET organization_ids = '[]'::jsonb
WHERE organization_ids IS NULL OR organization_ids = 'null'::jsonb;

-- =====================================================
-- STEP 9: VERIFICATION QUERIES
-- =====================================================
-- Display summary of changes
DO $$
DECLARE
    project_count INTEGER;
    assignment_count INTEGER;
    people_count INTEGER;
    org_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO project_count FROM projects;
    SELECT COUNT(*) INTO assignment_count FROM project_assignments;
    SELECT COUNT(*) INTO people_count FROM people;
    SELECT COUNT(*) INTO org_count FROM organizations;

    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Total projects: %', project_count;
    RAISE NOTICE 'Total assignments: %', assignment_count;
    RAISE NOTICE 'Total people: %', people_count;
    RAISE NOTICE 'Total organizations: %', org_count;
    RAISE NOTICE '==============================================';
END $$;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES (Run these after migration to verify)
-- =====================================================
-- Check project statuses
-- SELECT status, COUNT(*) FROM projects GROUP BY status;

-- Check assignment availability statuses
-- SELECT availability, COUNT(*) FROM project_assignments GROUP BY availability;

-- Check country values in people addresses
-- SELECT DISTINCT address->>'country' FROM people WHERE address IS NOT NULL;

-- Check country values in organization addresses
-- SELECT DISTINCT address->>'country' FROM organizations WHERE address IS NOT NULL;

-- Check city values
-- SELECT DISTINCT address->>'city' FROM people WHERE address IS NOT NULL ORDER BY address->>'city';

-- Check job types in people
-- SELECT DISTINCT jsonb_array_elements_text(jobs) as job_type FROM people WHERE jobs IS NOT NULL;
