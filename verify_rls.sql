-- VERIFY DATA VISIBILITY FOR ADMIN
-- Run each query separately in Supabase SQL Editor

-- 1. Check if facilities are visible (should return rows if RLS is correct)
SELECT id, name, organization_id FROM facilities;

-- 2. Check if residents are visible (should return rows if RLS is correct)
SELECT id, name, facility_id FROM residents;

-- 3. Check if daily_records are visible
SELECT id, facility_id, date FROM daily_records LIMIT 5;

-- 4. Verify the admin's staff record
SELECT id, email, role, organization_id, facility_id FROM staffs WHERE role = 'admin';

-- 5. List all RLS policies on residents
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'residents';
