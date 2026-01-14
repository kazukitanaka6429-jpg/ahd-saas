-- Comprehensive RLS Fix for Medical IV & V
-- Addresses the issue where Admins (facility_id is NULL) could not see data they saved.
-- Unifies policies to allow access if:
-- 1. User is Staff/Manager in the same facility.
-- 2. User is Admin in the same Organization.

-- ==========================================
-- 1. Medical IV (medical_cooperation_records)
-- ==========================================
ALTER TABLE medical_cooperation_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authorized staff" ON medical_cooperation_records;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON medical_cooperation_records;
-- Drop any other potential legacy policies
DROP POLICY IF EXISTS "Enable read access for authenticated users with same facility_id" ON medical_cooperation_records;
DROP POLICY IF EXISTS "Enable insert for authenticated users with same facility_id" ON medical_cooperation_records;
DROP POLICY IF EXISTS "Enable update for authenticated users with same facility_id" ON medical_cooperation_records;
DROP POLICY IF EXISTS "Enable delete for authenticated users with same facility_id" ON medical_cooperation_records;

CREATE POLICY "Enable all for authorized staff" ON medical_cooperation_records
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM staffs s
            LEFT JOIN facilities f ON f.id = medical_cooperation_records.facility_id
            WHERE s.auth_user_id = auth.uid()
            AND (
                -- Staff/Manager: Match Facility
                (s.facility_id IS NOT NULL AND s.facility_id = medical_cooperation_records.facility_id)
                OR 
                -- Admin: Match Organization
                (s.role = 'admin' AND f.organization_id = s.organization_id)
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM staffs s
            LEFT JOIN facilities f ON f.id = medical_cooperation_records.facility_id
            WHERE s.auth_user_id = auth.uid()
            AND (
                -- Staff/Manager: Match Facility
                (s.facility_id IS NOT NULL AND s.facility_id = medical_cooperation_records.facility_id)
                OR 
                -- Admin: Match Organization
                (s.role = 'admin' AND f.organization_id = s.organization_id)
            )
        )
    );

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
    USING (
        EXISTS (
            SELECT 1
            FROM staffs s
            LEFT JOIN facilities f ON f.id = medical_coord_v_records.facility_id
            WHERE s.auth_user_id = auth.uid()
            AND (
                (s.facility_id IS NOT NULL AND s.facility_id = medical_coord_v_records.facility_id)
                OR 
                (s.role = 'admin' AND f.organization_id = s.organization_id)
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM staffs s
            LEFT JOIN facilities f ON f.id = medical_coord_v_records.facility_id
            WHERE s.auth_user_id = auth.uid()
            AND (
                (s.facility_id IS NOT NULL AND s.facility_id = medical_coord_v_records.facility_id)
                OR 
                (s.role = 'admin' AND f.organization_id = s.organization_id)
            )
        )
    );

-- ==========================================
-- 3. Medical V Daily (medical_coord_v_daily)
-- ==========================================
ALTER TABLE medical_coord_v_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authorized staff" ON medical_coord_v_daily;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON medical_coord_v_daily;
DROP POLICY IF EXISTS "Enable read access for authenticated users with same facility_id" ON medical_coord_v_daily;
-- Drop any legacy keys just in case
DROP POLICY IF EXISTS "Enable insert/update for authenticated users with same facility_id" ON medical_coord_v_daily;

CREATE POLICY "Enable all for authorized staff" ON medical_coord_v_daily
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM staffs s
            LEFT JOIN facilities f ON f.id = medical_coord_v_daily.facility_id
            WHERE s.auth_user_id = auth.uid()
            AND (
                (s.facility_id IS NOT NULL AND s.facility_id = medical_coord_v_daily.facility_id)
                OR 
                (s.role = 'admin' AND f.organization_id = s.organization_id)
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM staffs s
            LEFT JOIN facilities f ON f.id = medical_coord_v_daily.facility_id
            WHERE s.auth_user_id = auth.uid()
            AND (
                (s.facility_id IS NOT NULL AND s.facility_id = medical_coord_v_daily.facility_id)
                OR 
                (s.role = 'admin' AND f.organization_id = s.organization_id)
            )
        )
    );

NOTIFY pgrst, 'reload schema';
