-- Fix: staffs table RLS policies for INSERT/UPDATE/DELETE
-- The staffs table only had SELECT policies, causing "new row violates row-level security policy" error

BEGIN;

-- Admin can insert new staff members
CREATE POLICY "Admins can insert staffs"
ON "staffs"
FOR INSERT
TO authenticated
WITH CHECK (public.is_any_admin());

-- Admin can update staff members
CREATE POLICY "Admins can update staffs"
ON "staffs"
FOR UPDATE
TO authenticated
USING (public.is_any_admin())
WITH CHECK (public.is_any_admin());

-- Admin can delete staff members
CREATE POLICY "Admins can delete staffs"
ON "staffs"
FOR DELETE
TO authenticated
USING (public.is_any_admin());

COMMIT;
