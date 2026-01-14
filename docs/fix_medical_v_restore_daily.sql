-- Medical Vの手入力数値（看護師数など）を保存するためのテーブルを復元
CREATE TABLE IF NOT EXISTS medical_coord_v_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID REFERENCES facilities(id) NOT NULL,
    date DATE NOT NULL,
    nurse_count INTEGER DEFAULT 0, -- 手入力された看護師数
    calculated_units INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(facility_id, date)
);

-- RLS設定
ALTER TABLE medical_coord_v_daily ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Enable all for authenticated users based on facility_id" ON medical_coord_v_daily;
    
    CREATE POLICY "Enable all for authenticated users based on facility_id"
    ON medical_coord_v_daily FOR ALL TO authenticated
    USING (facility_id = (auth.jwt() ->> 'facility_id')::uuid)
    WITH CHECK (facility_id = (auth.jwt() ->> 'facility_id')::uuid);
END $$;

GRANT ALL ON medical_coord_v_daily TO authenticated;
GRANT ALL ON medical_coord_v_daily TO service_role;
