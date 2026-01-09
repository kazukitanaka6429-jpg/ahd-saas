-- SAAS RLS UPDATE
-- Switch admin checks to organization-based, staff checks remain facility-based.

-- 1. Helper function for "My Organization ID"
-- Returns the organization_id of the current user.
CREATE OR REPLACE FUNCTION public.my_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM staffs
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- 2. Helper function for "Admin Status via Org"
-- Checks if current user is an admin of the specified organization.
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staffs
    WHERE auth_user_id = auth.uid()
    AND organization_id = org_id
    AND role = 'admin'
  );
$$;

-- 3. Update Policy for STAFFS table
-- View restriction:
-- Users can see their own record.
-- Admins can see all staffs in their organization.
-- Managers/Staffs can see staffs in their facility (unchanged from before mostly, but safer to use Org check for Admins).

DROP POLICY IF EXISTS "Users can read own staff records" ON "staffs";
DROP POLICY IF EXISTS "Admins can read all staff records" ON "staffs"; -- Dropping old one

CREATE POLICY "Users can read own staff records"
ON "staffs"
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid()
);

CREATE POLICY "Admins can read organization staff records"
ON "staffs"
FOR SELECT
TO authenticated
USING (
  public.is_org_admin(organization_id)
);

CREATE POLICY "Managers/Staff can read facility staff records"
ON "staffs"
FOR SELECT
TO authenticated
USING (
  -- User is not admin, but shares facility_id
  exists (
    select 1 from staffs s
    where s.auth_user_id = auth.uid()
    and s.role != 'admin'
    and s.facility_id is not null
    and s.facility_id = staffs.facility_id
  )
);

-- 4. General Policy Template for Data Tables (e.g. daily reports)
-- Data tables usually have `facility_id` but NOT `organization_id`.
-- So we join via `facilities` table to check organization.

-- Example: Updating medical_coord_v_daily RLS
-- (Note: we need to allow Admins of the Org that owns the facility to read)

-- Function to check if user has access to a given facility_id
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
BEGIN
    SELECT organization_id, role, facility_id INTO user_org, user_role, user_fac
    FROM staffs WHERE auth_user_id = auth.uid() LIMIT 1;
    
    -- If user not found, deny
    IF user_org IS NULL THEN RETURN false; END IF;
    
    -- Get target facility's organization
    SELECT organization_id INTO target_org FROM facilities WHERE id = fid;
    
    -- 1. Admin Logic: Must match Organization
    IF user_role = 'admin' THEN
        RETURN user_org = target_org;
    END IF;
    
    -- 2. Staff/Manager Logic: Must match Facility ID
    RETURN user_fac = fid;
END;
$$;

-- No need to drop/recreate all table policies right now unless requested, 
-- but we should update at least one to verify the pattern.
-- Let's apply this new pattern to `facilities` table reading first as it's critical for the switcher.

ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON "facilities";

CREATE POLICY "Users can read assigned facility"
ON "facilities"
FOR SELECT
TO authenticated
USING (
   public.can_access_facility(id)
);
