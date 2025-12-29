-- 1. 医療連携V 日次記録テーブル
-- 日ごとの看護師数と計算結果を保存
CREATE TABLE IF NOT EXISTS medical_coord_v_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID REFERENCES facilities(id) NOT NULL,
    date DATE NOT NULL,
    
    nurse_count INTEGER DEFAULT 0, -- 指導看護師数
    calculated_units INTEGER DEFAULT 0, -- 計算された単位数（保存用）
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(facility_id, date)
);

-- 2. 医療連携V 実施チェック記録（誰に実施したか）
-- 利用者ごとの実施チェック状態を保存
CREATE TABLE IF NOT EXISTS medical_coord_v_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medical_coord_v_daily_id UUID REFERENCES medical_coord_v_daily(id) ON DELETE CASCADE NOT NULL,
    resident_id UUID REFERENCES residents(id) NOT NULL,
    
    is_executed BOOLEAN DEFAULT false, -- チェックボックスの状態
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(medical_coord_v_daily_id, resident_id)
);

-- RLS Policies (Assuming standard facility-based access)
ALTER TABLE medical_coord_v_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_coord_v_records ENABLE ROW LEVEL SECURITY;

-- Note: Policies usually inherited or managed globally, but adding specific ones if needed.
-- For now, relying on backend (service role) or existing policies if they match by facility_id.
-- Adding basic policies just in case.

CREATE POLICY "Enable read for authenticated users based on facility_id"
ON medical_coord_v_daily
FOR SELECT
TO authenticated
USING (facility_id = (auth.jwt() ->> 'facility_id')::uuid);

CREATE POLICY "Enable insert/update for authenticated users based on facility_id"
ON medical_coord_v_daily
FOR ALL
TO authenticated
USING (facility_id = (auth.jwt() ->> 'facility_id')::uuid)
WITH CHECK (facility_id = (auth.jwt() ->> 'facility_id')::uuid);

-- Records table depends on daily table access, simplified here:
CREATE POLICY "Enable all for authenticated users"
ON medical_coord_v_records
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
