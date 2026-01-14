-- Simplify Medical RLS using SECURITY DEFINER function
-- This avoids the "RLS recursion" or "Permission Denied on Joined Tables" issue.
-- The function public.can_access_facility(fid) already encapsulates the logic:
-- 1. Admin -> Check if Organization matches.
-- 2. Staff -> Check if Facility matches.
-- And it runs with SECURITY DEFINER, so it can read tables even if the user can't directly.

-- ==========================================
-- 1. Medical IV (medical_cooperation_records)
-- ==========================================
ALTER TABLE medical_cooperation_records ENABLE ROW LEVEL SECURITY;

-- Drop all previous policies to avoid conflicts
DROP POLICY IF EXISTS "Enable all for authorized staff" ON medical_cooperation_records;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON medical_cooperation_records;
DROP POLICY IF EXISTS "Enable read access for authenticated users with same facility_id" ON medical_cooperation_records;
DROP POLICY IF EXISTS "Enable insert for authenticated users with same facility_id" ON medical_cooperation_records;
DROP POLICY IF EXISTS "Enable update for authenticated users with same facility_id" ON medical_cooperation_records;
DROP POLICY IF EXISTS "Enable delete for authenticated users with same facility_id" ON medical_cooperation_records;

CREATE POLICY "Enable all for authorized staff" ON medical_cooperation_records
    FOR ALL
    TO authenticated
    USING (public.can_access_facility(facility_id))
    WITH CHECK (public.can_access_facility(facility_id));


-- ==========================================
-- 2. Medical V Lists (medical_coord_v_records)
-- ==========================================
ALTER TABLE medical_coord_v_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authorized staff" ON medical_coord_v_records;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON medical_coord_v_records;
DROP POLICY IF EXISTS "Enable read access for authenticated users with same facility_id" ON medical_coord_v_records;
DROP POLICY IF EXISTS "Enable insert for authenticated users with same facility_id" ON medical_coord_v_records;
DROP POLICY IF EXISTS "Enable update for authenticated users with same facility_id" ON medical_coord_v_records;
DROP POLICY IF EXISTS "Enable delete for authenticated users with same facility_id" ON medical_coord_v_records;

CREATE POLICY "Enable all for authorized staff" ON medical_coord_v_records
    FOR ALL
    TO authenticated
    USING (public.can_access_facility(facility_id))
    WITH CHECK (public.can_access_facility(facility_id));


-- ==========================================
-- 3. Medical V Daily (medical_coord_v_daily)
-- ==========================================
ALTER TABLE medical_coord_v_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authorized staff" ON medical_coord_v_daily;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON medical_coord_v_daily;
DROP POLICY IF EXISTS "Enable read access for authenticated users with same facility_id" ON medical_coord_v_daily;
DROP POLICY IF EXISTS "Enable insert/update for authenticated users with same facility_id" ON medical_coord_v_daily;

CREATE POLICY "Enable all for authorized staff" ON medical_coord_v_daily
    FOR ALL
    TO authenticated
    USING (public.can_access_facility(facility_id))
    WITH CHECK (public.can_access_facility(facility_id));

NOTIFY pgrst, 'reload schema';
