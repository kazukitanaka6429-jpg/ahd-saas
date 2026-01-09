-- BACKFILL FACILITY ORGANIZATION IDs
-- Existing facilities might have NULL organization_id, which blocks Admins (who are now enforced to verify Org ID) from updating them.

-- 1. Create a function to perform the backfill based on the first found Admin's Org
-- This assumes a single-tenant or single-org scenario for the main data.
DO $$
DECLARE
    target_org_id UUID;
BEGIN
    -- Get the organization_id from the first admin we find (likely the main user)
    SELECT organization_id INTO target_org_id 
    FROM staffs 
    WHERE role = 'admin' 
    LIMIT 1;

    IF target_org_id IS NOT NULL THEN
        -- Update facilities that have NULL organization_id
        UPDATE facilities
        SET organization_id = target_org_id
        WHERE organization_id IS NULL;
        
        RAISE NOTICE 'Backfilled facilities with organization_id: %', target_org_id;
    END IF;
END $$;
