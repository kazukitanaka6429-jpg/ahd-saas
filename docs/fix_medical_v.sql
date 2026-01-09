-- Medical Coordination V: Complete Fix Script
-- Handles VIEW/TABLE mismatch and ensures correct schema

-- Step 1: Drop any VIEWs that might have been incorrectly created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'medical_coord_v_records' 
        AND table_type = 'VIEW'
    ) THEN
        DROP VIEW medical_coord_v_records;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'medical_coord_v_daily' 
        AND table_type = 'VIEW'
    ) THEN
        DROP VIEW medical_coord_v_daily CASCADE;
    END IF;
END $$;

-- Step 2: Create Tables (if not exist)
CREATE TABLE IF NOT EXISTS medical_coord_v_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID REFERENCES facilities(id) NOT NULL,
    date DATE NOT NULL,
    nurse_count INTEGER DEFAULT 0,
    calculated_units INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(facility_id, date)
);

CREATE TABLE IF NOT EXISTS medical_coord_v_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medical_coord_v_daily_id UUID REFERENCES medical_coord_v_daily(id) ON DELETE CASCADE NOT NULL,
    resident_id UUID REFERENCES residents(id) NOT NULL,
    is_executed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(medical_coord_v_daily_id, resident_id)
);

-- Step 3: Ensure is_executed column exists (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'medical_coord_v_records' 
        AND column_name = 'is_executed'
    ) THEN
        ALTER TABLE medical_coord_v_records ADD COLUMN is_executed BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Step 4: Drop old policies
DROP POLICY IF EXISTS "Enable read for authenticated users based on facility_id" ON medical_coord_v_daily;
DROP POLICY IF EXISTS "Enable insert/update for authenticated users based on facility_id" ON medical_coord_v_daily;
DROP POLICY IF EXISTS "Enable all for users based on facility_id" ON medical_coord_v_daily;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON medical_coord_v_records;
DROP POLICY IF EXISTS "Medical V Daily Access" ON medical_coord_v_daily;
DROP POLICY IF EXISTS "Medical V Records Access" ON medical_coord_v_records;

-- Step 5: Enable RLS
ALTER TABLE medical_coord_v_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_coord_v_records ENABLE ROW LEVEL SECURITY;

-- Step 6: Grant Permissions
GRANT ALL ON medical_coord_v_daily TO authenticated;
GRANT ALL ON medical_coord_v_records TO authenticated;
GRANT ALL ON medical_coord_v_daily TO service_role;
GRANT ALL ON medical_coord_v_records TO service_role;

-- Step 7: Create Policies
CREATE POLICY "Medical V Daily Access"
ON medical_coord_v_daily FOR ALL TO authenticated
USING (
    facility_id IN (SELECT facility_id FROM staffs WHERE auth_user_id = auth.uid())
)
WITH CHECK (
    facility_id IN (SELECT facility_id FROM staffs WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Medical V Records Access"
ON medical_coord_v_records FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM medical_coord_v_daily d
        WHERE d.id = medical_coord_v_records.medical_coord_v_daily_id
        AND d.facility_id IN (SELECT facility_id FROM staffs WHERE auth_user_id = auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM medical_coord_v_daily d
        WHERE d.id = medical_coord_v_records.medical_coord_v_daily_id
        AND d.facility_id IN (SELECT facility_id FROM staffs WHERE auth_user_id = auth.uid())
    )
);
