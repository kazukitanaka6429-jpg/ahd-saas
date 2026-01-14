-- Fix RLS for Medical Cooperation IV (medical_cooperation_records)
-- Issue: Data was not visible after insert/update due to restrictive or mismatching RLS policies.
-- Solution: Standardize RLS to check facility_id match for Staff, and Organization match for Admin.

ALTER TABLE medical_cooperation_records ENABLE ROW LEVEL SECURITY;

-- 1. Drop all existing policies to ensure clean slate
DROP POLICY IF EXISTS "Enable read access for authenticated users with same facility_id" ON medical_cooperation_records;
DROP POLICY IF EXISTS "Enable insert for authenticated users with same facility_id" ON medical_cooperation_records;
DROP POLICY IF EXISTS "Enable update for authenticated users with same facility_id" ON medical_cooperation_records;
DROP POLICY IF EXISTS "Enable delete for authenticated users with same facility_id" ON medical_cooperation_records;
DROP POLICY IF EXISTS "Enable all for authorized staff" ON medical_cooperation_records;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON medical_cooperation_records;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON medical_cooperation_records;

-- 2. Create one comprehensive policy for ALL operations
CREATE POLICY "Enable all for authorized staff" ON medical_cooperation_records
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM staffs s
            -- Check Facility first for performance (if staff has facility_id)
            -- But for Admin we need Organization check, which requires joining Facility of the record
            LEFT JOIN facilities f ON f.id = medical_cooperation_records.facility_id
            WHERE s.auth_user_id = auth.uid()
            AND (
                -- Case A: User is Staff/Manager in the same facility
                (s.facility_id IS NOT NULL AND s.facility_id = medical_cooperation_records.facility_id)
                OR 
                -- Case B: User is Admin in the same organization
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
                -- Case A: User is Staff/Manager in the same facility
                (s.facility_id IS NOT NULL AND s.facility_id = medical_cooperation_records.facility_id)
                OR 
                -- Case B: User is Admin in the same organization
                (s.role = 'admin' AND f.organization_id = s.organization_id)
            )
        )
    );

NOTIFY pgrst, 'reload schema';
