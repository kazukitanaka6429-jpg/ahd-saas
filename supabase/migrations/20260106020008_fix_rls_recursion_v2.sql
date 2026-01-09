-- FIX RLS RECURSION V2
-- The previous policy for Managers/Staff used a direct subquery on 'staffs', causing infinite recursion.
-- We move that lookup into a SECURITY DEFINER function.

-- 1. Helper for getting current user's facility_id safely
CREATE OR REPLACE FUNCTION public.my_facility_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT facility_id FROM staffs
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- 2. Drop the recursive policy
DROP POLICY IF EXISTS "Managers/Staff can read facility staff records" ON "staffs";

-- 3. Recreate with safe function call
CREATE POLICY "Managers/Staff can read facility staff records"
ON "staffs"
FOR SELECT
TO authenticated
USING (
  -- If the row's facility_id matches the user's facility_id
  -- (And implicitly, if user is Admin with null facility, this comparison fails, which is fine as they have their own policy)
  facility_id = public.my_facility_id()
);
