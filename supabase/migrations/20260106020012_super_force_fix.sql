-- SUPER FORCE FIX
-- Update ALL facilities to match the Admin's organization.
-- This handles cases where facilities had a different (non-NULL) organization_id.

BEGIN;

-- Temporarily disable RLS
ALTER TABLE facilities DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    target_org_id UUID;
BEGIN
    -- Get the organization_id from the admin.
    SELECT organization_id INTO target_org_id 
    FROM staffs 
    WHERE role = 'admin' AND organization_id IS NOT NULL 
    LIMIT 1;

    IF target_org_id IS NOT NULL THEN
        -- Unconditionally update ALL facilities to this Org ID
        UPDATE facilities
        SET organization_id = target_org_id;
        
        RAISE NOTICE 'Updated all facilities to Organization ID: %', target_org_id;
    ELSE
        RAISE EXCEPTION 'No Admin Organization found!';
    END IF;
END $$;

-- Re-enable RLS
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

COMMIT;
