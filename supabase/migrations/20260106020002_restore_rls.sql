-- RESTORE RLS POLICIES (Fix for Unauthorized error after revert)

-- 1. Enable RLS (Ensure it's on)
ALTER TABLE "staffs" ENABLE ROW LEVEL SECURITY;

-- 2. Drop all potential policies to ensure a clean slate
-- (Including the one that caused the error)
DROP POLICY IF EXISTS "Users can read own staff records" ON "staffs";
DROP POLICY IF EXISTS "Users can read own staff record" ON "staffs"; -- Variation
DROP POLICY IF EXISTS "Enable read access for users based on auth_user_id" ON "staffs";
DROP POLICY IF EXISTS "Allow individual read access" ON "staffs";
DROP POLICY IF EXISTS "Admins can read all staff records" ON "staffs"; -- FIXED: Added this drop

-- 3. Create standard "Read Own" policy
-- This allows any authenticated user to read staff records that match their auth_user_id.
CREATE POLICY "Users can read own staff records"
ON "staffs"
FOR SELECT
TO authenticated
USING (
  auth.uid() = auth_user_id
);

-- 4. Grant permissions
GRANT SELECT ON "staffs" TO authenticated;

-- 5. Admin policy
CREATE POLICY "Admins can read all staff records"
ON "staffs"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staffs s 
    WHERE s.auth_user_id = auth.uid() AND s.role = 'admin'
  )
);
