-- ============================================================
-- Fix RLS for Headquarters Staff (facility_id is NULL)
-- ============================================================
-- Update can_access_facility to allow staff with NULL facility_id 
-- to access any facility within their organization.

CREATE OR REPLACE FUNCTION public.can_access_facility(fid UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_org UUID;
    user_role TEXT;
    user_fac UUID;
    target_org UUID;
    cached_uid UUID;
BEGIN
    -- Cache auth.uid() to avoid repeated calls
    cached_uid := (select auth.uid());
    
    SELECT organization_id, role, facility_id INTO user_org, user_role, user_fac
    FROM staffs WHERE auth_user_id = cached_uid LIMIT 1;
    
    IF user_org IS NULL THEN RETURN false; END IF;
    
    SELECT organization_id INTO target_org FROM facilities WHERE id = fid;
    
    -- Admin OR HQ Staff (facility_id is NULL) -> Check Org Match
    IF user_role = 'admin' OR user_fac IS NULL THEN
        RETURN user_org = target_org;
    END IF;
    
    -- Facility Staff -> Check Facility Match
    RETURN user_fac = fid;
END;
$$;
