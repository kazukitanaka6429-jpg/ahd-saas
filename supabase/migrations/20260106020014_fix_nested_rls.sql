-- FIX NESTED RLS ISSUE
-- The facilities policies query the staffs table, which also has RLS.
-- This causes the permission check subquery to fail.
-- Solution: Use a SECURITY DEFINER function that bypasses RLS.

BEGIN;

-- 1. Create a SECURITY DEFINER function to check if current user is an admin
-- This function runs with elevated privileges and bypasses RLS on staffs.
CREATE OR REPLACE FUNCTION public.is_any_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staffs
    WHERE auth_user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- 2. Drop the old policies that use raw subqueries
DROP POLICY IF EXISTS "Admins can insert facilities (Simple)" ON "facilities";
DROP POLICY IF EXISTS "Admins can update facilities (Simple)" ON "facilities";
DROP POLICY IF EXISTS "Admins can delete facilities (Simple)" ON "facilities";

-- 3. Create new policies using the SECURITY DEFINER function
CREATE POLICY "Admins can insert facilities"
ON "facilities"
FOR INSERT
TO authenticated
WITH CHECK (public.is_any_admin());

CREATE POLICY "Admins can update facilities"
ON "facilities"
FOR UPDATE
TO authenticated
USING (public.is_any_admin())
WITH CHECK (public.is_any_admin());

CREATE POLICY "Admins can delete facilities"
ON "facilities"
FOR DELETE
TO authenticated
USING (public.is_any_admin());

COMMIT;
