-- Fix RLS for Medical Cooperation tables to allow Admins (who have facility_id=NULL) to access data
-- Tables: medical_cooperation_records, medical_coord_v_daily, medical_coord_v_records

-- Helper logic for policies:
-- Allow if:
-- 1. User is a staff member of the facility (s.facility_id = record.facility_id)
-- 2. OR User is an ADMIN of the same organization (s.role = 'admin' AND s.organization_id = f.organization_id)

-- 1. medical_cooperation_records
ALTER TABLE medical_cooperation_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users with same facility_id" ON medical_cooperation_records;
DROP POLICY IF EXISTS "Enable insert for authenticated users with same facility_id" ON medical_cooperation_records;
DROP POLICY IF EXISTS "Enable update for authenticated users with same facility_id" ON medical_cooperation_records;
DROP POLICY IF EXISTS "Enable delete for authenticated users with same facility_id" ON medical_cooperation_records;
-- Also drop any other potential policies to be clean
DROP POLICY IF EXISTS "Enable all for authenticated users" ON medical_cooperation_records;

CREATE POLICY "Enable all for authorized staff" ON medical_cooperation_records
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM staffs s
            JOIN facilities f ON f.id = medical_cooperation_records.facility_id
            WHERE s.auth_user_id = auth.uid()
            AND (
                s.facility_id = medical_cooperation_records.facility_id
                OR (s.role = 'admin' AND s.organization_id = f.organization_id)
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM staffs s
            JOIN facilities f ON f.id = medical_cooperation_records.facility_id
            WHERE s.auth_user_id = auth.uid()
            AND (
                s.facility_id = medical_cooperation_records.facility_id
                OR (s.role = 'admin' AND s.organization_id = f.organization_id)
            )
        )
    );


-- 2. medical_coord_v_daily
ALTER TABLE medical_coord_v_daily ENABLE ROW LEVEL SECURITY;

-- Drop old policies (some might use JWT logic which is fragile or incorrect here)
DROP POLICY IF EXISTS "Enable read for authenticated users based on facility_id" ON medical_coord_v_daily;
DROP POLICY IF EXISTS "Enable insert/update for authenticated users based on facility_id" ON medical_coord_v_daily;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON medical_coord_v_daily;

CREATE POLICY "Enable all for authorized staff" ON medical_coord_v_daily
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM staffs s
            JOIN facilities f ON f.id = medical_coord_v_daily.facility_id
            WHERE s.auth_user_id = auth.uid()
            AND (
                s.facility_id = medical_coord_v_daily.facility_id
                OR (s.role = 'admin' AND s.organization_id = f.organization_id)
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM staffs s
            JOIN facilities f ON f.id = medical_coord_v_daily.facility_id
            WHERE s.auth_user_id = auth.uid()
            AND (
                s.facility_id = medical_coord_v_daily.facility_id
                OR (s.role = 'admin' AND s.organization_id = f.organization_id)
            )
        )
    );


-- 3. medical_coord_v_records
-- This table links to medical_coord_v_daily, so it doesn't have facility_id directly?
-- Let's check schema. 20250101000013_medical_v.sql says:
-- medical_coord_v_daily_id UUID REFERENCES medical_coord_v_daily(id)
-- resident_id UUID REFERENCES residents(id)
-- It does NOT have facility_id directly.
-- So we must join through medical_coord_v_daily.

ALTER TABLE medical_coord_v_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON medical_coord_v_records;

CREATE POLICY "Enable all for authorized staff" ON medical_coord_v_records
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM medical_coord_v_daily d
            JOIN staffs s ON s.auth_user_id = auth.uid()
            JOIN facilities f ON f.id = d.facility_id
            WHERE d.id = medical_coord_v_records.medical_coord_v_daily_id
            AND (
                s.facility_id = d.facility_id
                OR (s.role = 'admin' AND s.organization_id = f.organization_id)
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM medical_coord_v_daily d
            JOIN staffs s ON s.auth_user_id = auth.uid()
            JOIN facilities f ON f.id = d.facility_id
            WHERE d.id = medical_coord_v_records.medical_coord_v_daily_id
            AND (
                s.facility_id = d.facility_id
                OR (s.role = 'admin' AND s.organization_id = f.organization_id)
            )
        )
    );

NOTIFY pgrst, 'reload schema';
