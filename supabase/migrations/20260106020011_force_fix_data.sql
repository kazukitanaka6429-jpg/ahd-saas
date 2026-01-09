-- FORCE FIX DATA INCONSISTENCY
-- Use this to forcefully resolve RLS errors caused by NULL organization_ids.

BEGIN;

-- 1. Disable RLS temporarily to allow bulk updates
ALTER TABLE facilities DISABLE ROW LEVEL SECURITY;
ALTER TABLE staffs DISABLE ROW LEVEL SECURITY;

-- 2. Ensure a DEFAULT Organization exists
INSERT INTO organizations (code, name)
VALUES ('DEFAULT', '初期法人')
ON CONFLICT (code) DO NOTHING;

-- 3. Fix Admin Staffs with NULL organization_id
-- Assign them to the DEFAULT organization if they don't have one.
UPDATE staffs
SET organization_id = (SELECT id FROM organizations WHERE code = 'DEFAULT')
WHERE role = 'admin' AND organization_id IS NULL;

-- 4. Fix Facilities with NULL organization_id
-- Assign them to the organization of the first found Admin.
WITH admin_org AS (
    SELECT organization_id FROM staffs WHERE role = 'admin' AND organization_id IS NOT NULL LIMIT 1
)
UPDATE facilities
SET organization_id = (SELECT organization_id FROM admin_org)
WHERE organization_id IS NULL;

-- 5. Re-enable RLS
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE staffs ENABLE ROW LEVEL SECURITY;

COMMIT;
