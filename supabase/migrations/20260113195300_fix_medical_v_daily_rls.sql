-- Fix RLS for medical_coord_v_daily table
-- Error: "new row violates row-level security policy for table medical_coord_v_daily"
-- This prevents admins from saving/reading nurse counts

ALTER TABLE medical_coord_v_daily ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable all for authorized staff" ON medical_coord_v_daily;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON medical_coord_v_daily;
DROP POLICY IF EXISTS "Enable read access for authenticated users with same facility_id" ON medical_coord_v_daily;
DROP POLICY IF EXISTS "Enable insert/update for authenticated users with same facility_id" ON medical_coord_v_daily;

-- Use the SECURITY DEFINER function that properly handles Admin vs Staff access
CREATE POLICY "Enable all for authorized staff" ON medical_coord_v_daily
    FOR ALL
    TO authenticated
    USING (public.can_access_facility(facility_id))
    WITH CHECK (public.can_access_facility(facility_id));

NOTIFY pgrst, 'reload schema';
