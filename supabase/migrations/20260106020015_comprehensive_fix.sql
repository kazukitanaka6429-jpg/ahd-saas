-- COMPREHENSIVE SYSTEM FIX
-- Fixes: Schema, RLS, and Data Integrity issues

BEGIN;

-- =======================
-- PART 1: SCHEMA FIXES
-- =======================

-- Add provider_number column to facilities if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'facilities' AND column_name = 'provider_number'
    ) THEN
        ALTER TABLE facilities ADD COLUMN provider_number TEXT;
    END IF;
END $$;

-- Add organization_id to facilities if not exists (for SaaS)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'facilities' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE facilities ADD COLUMN organization_id UUID REFERENCES organizations(id);
    END IF;
END $$;

-- =======================
-- PART 2: RLS FIXES
-- =======================

-- 2.1 Fix facilities SELECT policy (use SECURITY DEFINER function)
DROP POLICY IF EXISTS "Users can read assigned facility" ON "facilities";

CREATE POLICY "Admins can read all facilities"
ON "facilities"
FOR SELECT
TO authenticated
USING (public.is_any_admin());

-- For non-admins: they can see their own facility
CREATE POLICY "Staff can read own facility"
ON "facilities"
FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT facility_id FROM staffs 
        WHERE auth_user_id = auth.uid() AND facility_id IS NOT NULL
    )
);

-- 2.2 Fix residents RLS (likely causing daily report issue)
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read residents" ON "residents";
DROP POLICY IF EXISTS "Admins can read all residents" ON "residents";
DROP POLICY IF EXISTS "Staff can read facility residents" ON "residents";

-- Admins: Can see all residents in their organization's facilities
CREATE POLICY "Admins can read all residents"
ON "residents"
FOR SELECT
TO authenticated
USING (public.is_any_admin());

-- Staff: Can see residents in their own facility
CREATE POLICY "Staff can read facility residents"
ON "residents"
FOR SELECT
TO authenticated
USING (
    facility_id IN (
        SELECT facility_id FROM staffs 
        WHERE auth_user_id = auth.uid() AND facility_id IS NOT NULL
    )
);

-- Allow admins to modify residents
CREATE POLICY "Admins can insert residents"
ON "residents"
FOR INSERT
TO authenticated
WITH CHECK (public.is_any_admin());

CREATE POLICY "Admins can update residents"
ON "residents"
FOR UPDATE
TO authenticated
USING (public.is_any_admin())
WITH CHECK (public.is_any_admin());

CREATE POLICY "Admins can delete residents"
ON "residents"
FOR DELETE
TO authenticated
USING (public.is_any_admin());

-- 2.3 Fix report_entries RLS (for daily reports)
ALTER TABLE report_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read report entries" ON "report_entries";

CREATE POLICY "Admins can read all report entries"
ON "report_entries"
FOR SELECT
TO authenticated
USING (public.is_any_admin());

CREATE POLICY "Staff can read facility report entries"
ON "report_entries"
FOR SELECT
TO authenticated
USING (
    facility_id IN (
        SELECT facility_id FROM staffs 
        WHERE auth_user_id = auth.uid() AND facility_id IS NOT NULL
    )
);

CREATE POLICY "Staff can insert report entries"
ON "report_entries"
FOR INSERT
TO authenticated
WITH CHECK (
    facility_id IN (
        SELECT facility_id FROM staffs 
        WHERE auth_user_id = auth.uid() AND facility_id IS NOT NULL
    )
    OR public.is_any_admin()
);

CREATE POLICY "Staff can update report entries"
ON "report_entries"
FOR UPDATE
TO authenticated
USING (
    facility_id IN (
        SELECT facility_id FROM staffs 
        WHERE auth_user_id = auth.uid() AND facility_id IS NOT NULL
    )
    OR public.is_any_admin()
);

COMMIT;
