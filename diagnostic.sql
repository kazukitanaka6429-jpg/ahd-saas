-- DIAGNOSTIC SCRIPT FOR RLS DEBUGGING
-- Run this SQL to understand the current state of policies and data.

-- 1. List ALL RLS Policies on 'facilities' table
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'facilities';

-- 2. List ALL RLS Policies on 'staffs' table (subquery might be blocked by this)
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'staffs';

-- 3. Check RLS status for tables
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname IN ('facilities', 'staffs', 'organizations');

-- 4. Examine Admin Staffs data (RLS bypassed for this diagnostic)
SELECT id, email, role, organization_id, facility_id, auth_user_id
FROM staffs
WHERE role = 'admin';

-- 5. Examine Organizations data
SELECT * FROM organizations;

-- 6. Examine Facilities data
SELECT id, name, organization_id FROM facilities LIMIT 10;
