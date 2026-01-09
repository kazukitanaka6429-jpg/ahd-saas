-- FIX FACILITIES RLS WRITE ACCESS
-- Currently only SELECT is allowed. We need to allow Admins to INSERT, UPDATE, DELETE facilities within their organization.

-- 1. INSERT Policy
-- Only Admins can insert facilities. The new facility must belong to their organization.
CREATE POLICY "Admins can insert facilities for their org"
ON "facilities"
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
);

-- 2. UPDATE Policy
-- Only Admins can update facilities. The facility must belong to their organization.
CREATE POLICY "Admins can update facilities for their org"
ON "facilities"
FOR UPDATE
TO authenticated
USING (
  public.is_org_admin(organization_id)
)
WITH CHECK (
  public.is_org_admin(organization_id)
);

-- 3. DELETE Policy
-- Only Admins can delete facilities.
CREATE POLICY "Admins can delete facilities for their org"
ON "facilities"
FOR DELETE
TO authenticated
USING (
  public.is_org_admin(organization_id)
);
