-- Transfer Ownership Script
-- This will transfer all data from admin@example.com to your new user

-- Step 1: Find the user IDs
-- Run this first to get the UUIDs:
SELECT id, email FROM auth.users;

-- Step 2: Replace these UUIDs with the actual values from Step 1
-- OLD_USER_ID = the UUID of admin@example.com
-- NEW_USER_ID = the UUID of mortimer.cerny@gmail.com (should be: 8e3f873a-89d2-4f51-88a7-72e82335b436)

-- Step 3: Transfer ownership of all people records
UPDATE people
SET user_id = '8e3f873a-89d2-4f51-88a7-72e82335b436'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'admin@example.com'
);

-- Step 4: Transfer ownership of all projects records
UPDATE projects
SET user_id = '8e3f873a-89d2-4f51-88a7-72e82335b436'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'admin@example.com'
);

-- Step 5: Transfer ownership of all organizations records
UPDATE organizations
SET user_id = '8e3f873a-89d2-4f51-88a7-72e82335b436'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'admin@example.com'
);

-- Step 6: Transfer ownership of all project_assignments records
UPDATE project_assignments
SET user_id = '8e3f873a-89d2-4f51-88a7-72e82335b436'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'admin@example.com'
);

-- Step 7: Verify the transfer (optional)
SELECT 'people' as table_name, COUNT(*) as count
FROM people
WHERE user_id = '8e3f873a-89d2-4f51-88a7-72e82335b436'
UNION ALL
SELECT 'projects', COUNT(*)
FROM projects
WHERE user_id = '8e3f873a-89d2-4f51-88a7-72e82335b436'
UNION ALL
SELECT 'organizations', COUNT(*)
FROM organizations
WHERE user_id = '8e3f873a-89d2-4f51-88a7-72e82335b436'
UNION ALL
SELECT 'project_assignments', COUNT(*)
FROM project_assignments
WHERE user_id = '8e3f873a-89d2-4f51-88a7-72e82335b436';

-- Step 8: Delete the old admin user (ONLY after verifying Step 7!)
-- WARNING: This is irreversible!
-- DELETE FROM auth.users WHERE email = 'admin@example.com';
