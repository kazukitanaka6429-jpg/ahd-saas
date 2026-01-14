-- Fix RLS for Medical V Records to be "Flat" and independent of the Daily table (which is optional/deprecated in usage)
-- This allows records to be visible even if they are inserted without a link to a parent daily record.

ALTER TABLE medical_coord_v_records ENABLE ROW LEVEL SECURITY;

-- 1. Drop the old policy that relied on JOINs with medical_coord_v_daily
DROP POLICY IF EXISTS "Enable all for authorized staff" ON medical_coord_v_records;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON medical_coord_v_records;

-- 2. Create new policy relying DIRECTLY on facility_id column in the record itself
-- This requires that the application properly populates `facility_id` on INSERT (which it does).

CREATE POLICY "Enable all for authorized staff flat" ON medical_coord_v_records
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM staffs s
            -- Join facilities to check Organization ID for Admins
            LEFT JOIN facilities f ON f.id = medical_coord_v_records.facility_id
            WHERE s.auth_user_id = auth.uid()
            AND (
                -- Case 1: Staff user belongs to the same facility
                s.facility_id = medical_coord_v_records.facility_id
                
                -- Case 2: Admin user belongs to the same Organization as the facility
                OR (s.role = 'admin' AND s.organization_id = f.organization_id)
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
                -- Case 1: Staff user belongs to the same facility
                s.facility_id = medical_coord_v_records.facility_id
                
                -- Case 2: Admin user belongs to the same Organization as the facility
                OR (s.role = 'admin' AND s.organization_id = f.organization_id)
            )
        )
    );

-- Notify schema cache reload
NOTIFY pgrst, 'reload schema';
