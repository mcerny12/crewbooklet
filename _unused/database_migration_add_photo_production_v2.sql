-- Migration: Add Photo Production business type
-- Description: Adds "Photo Production" to the jobs array values in organizations table
-- Date: 2025-01-16

-- Option 1: If you're using a text array (most likely based on your Swift code)
-- No migration needed - just add the value in the app and it will work!
-- The jobs column in organizations table accepts any text values in the array.

-- Option 2: If you need to verify the column type, run this query:
-- SELECT column_name, data_type, udt_name
-- FROM information_schema.columns
-- WHERE table_name = 'organizations' AND column_name = 'jobs';

-- Option 3: If there IS an enum and it has a different name, first find it:
-- SELECT t.typname
-- FROM pg_type t
-- JOIN pg_enum e ON t.oid = e.enumtypid
-- WHERE e.enumlabel IN ('Agency', 'Film Production');

-- Then use that type name in:
-- ALTER TYPE [actual_type_name] ADD VALUE IF NOT EXISTS 'Photo Production';

-- Most likely, your jobs column is just a text array (text[]) and doesn't use an enum,
-- so the Swift code change is all you need!
