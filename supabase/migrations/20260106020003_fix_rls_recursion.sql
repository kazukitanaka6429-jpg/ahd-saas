-- FIX RLS RECURSION
-- The previous Admin policy caused infinite recursion because verifying "is admin" required reading the table, which checked the policy again.

-- 1. Create a secure function to check admin status (Bypassing RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER -- Runs with privileges of creator (admin), bypassing RLS
SET search_path = public -- Secure search path
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staffs
    WHERE auth_user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- 2. Drop the recursive policy
DROP POLICY IF EXISTS "Admins can read all staff records" ON "staffs";

-- 3. Re-create policy using the function
CREATE POLICY "Admins can read all staff records"
ON "staffs"
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);
