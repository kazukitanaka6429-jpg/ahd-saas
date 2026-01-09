-- Fix constraints for ON CONFLICT clauses
-- 1. medical_cooperation_records: Needs (facility_id, resident_id, date)
-- Previously it might have been (resident_id, date) or none.

DO $$
BEGIN
    -- Drop old constraints if they exist (names might vary, trying common ones)
    ALTER TABLE medical_cooperation_records DROP CONSTRAINT IF EXISTS medical_cooperation_records_resident_id_date_key;
    ALTER TABLE medical_cooperation_records DROP CONSTRAINT IF EXISTS unique_medical_record;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Add correct constraint
ALTER TABLE medical_cooperation_records
ADD CONSTRAINT unique_medical_record UNIQUE (facility_id, resident_id, date);


-- 2. medical_coord_v_daily: Needs (facility_id, date)
-- Check if table exists (it should from previous migrations)
CREATE TABLE IF NOT EXISTS medical_coord_v_daily (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id uuid REFERENCES facilities(id) NOT NULL,
    date date NOT NULL,
    nurse_count integer DEFAULT 0,
    calculated_units integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);

DO $$
BEGIN
    ALTER TABLE medical_coord_v_daily DROP CONSTRAINT IF EXISTS medical_coord_v_daily_facility_id_date_key;
    ALTER TABLE medical_coord_v_daily DROP CONSTRAINT IF EXISTS unique_daily_medical_v;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Add correct constraint
ALTER TABLE medical_coord_v_daily
ADD CONSTRAINT unique_daily_medical_v UNIQUE (facility_id, date);

-- Enable RLS for daily table as well if not already
ALTER TABLE medical_coord_v_daily ENABLE ROW LEVEL SECURITY;

-- Add policies for daily table if missing (safe to re-run with IF NOT EXISTS logic or replacement)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON medical_coord_v_daily;
CREATE POLICY "Enable all for authenticated users" ON medical_coord_v_daily
    FOR ALL
    TO authenticated
    USING (facility_id = (select facility_id from staffs where auth.uid() = staffs.auth_user_id))
    WITH CHECK (facility_id = (select facility_id from staffs where auth.uid() = staffs.auth_user_id));

NOTIFY pgrst, 'reload schema';
