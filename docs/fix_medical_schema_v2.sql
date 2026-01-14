-- 医療連携IV (Medical V) および IV (Staff Structure) 用の正しいスキーマ
-- app/actions/medical-coordination.ts のコード実装に完全に準拠します

-- 既存の不整合なテーブルを削除 (データロスのリスクがありますが、スキーマ不一致のため再構築が必要です)
DROP TABLE IF EXISTS medical_coord_v_records CASCADE;
DROP TABLE IF EXISTS medical_coord_v_daily CASCADE; 

-- 1. 医療連携IV 体制記録 (Staff Classification: iv_1, iv_2, iv_3)
CREATE TABLE IF NOT EXISTS medical_coord_iv_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    facility_id UUID REFERENCES facilities(id) NOT NULL,
    staff_id UUID REFERENCES staffs(id) NOT NULL,
    date DATE NOT NULL,
    
    assigned_resident_count INTEGER DEFAULT 0,
    classification TEXT, -- 'iv_1', 'iv_2', 'iv_3', 'iv_0'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(staff_id, date)
);

-- 2. 医療連携V 実施記録 (Care Contents: 実際の訪問看護記録)
CREATE TABLE IF NOT EXISTS medical_coord_v_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    facility_id UUID REFERENCES facilities(id) NOT NULL,
    resident_id UUID REFERENCES residents(id) NOT NULL,
    staff_id UUID REFERENCES staffs(id), -- 実施者 (Performer)
    date DATE NOT NULL,
    
    start_time TEXT,
    end_time TEXT,
    care_contents JSONB DEFAULT '{}', -- 詳細な処置内容
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    -- 1日に複数回の記録を許容するためUNIQUE制約はなし
);

-- RLS (Row Level Security) の設定
ALTER TABLE medical_coord_iv_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_coord_v_records ENABLE ROW LEVEL SECURITY;

-- ポリシーの作成 (施設IDに基づくアクセス制御)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Enable all for authenticated users based on facility_id" ON medical_coord_iv_records;
    DROP POLICY IF EXISTS "Enable all for authenticated users based on facility_id" ON medical_coord_v_records;
    
    CREATE POLICY "Enable all for authenticated users based on facility_id"
    ON medical_coord_iv_records FOR ALL TO authenticated
    USING (facility_id = (auth.jwt() ->> 'facility_id')::uuid)
    WITH CHECK (facility_id = (auth.jwt() ->> 'facility_id')::uuid);

    CREATE POLICY "Enable all for authenticated users based on facility_id"
    ON medical_coord_v_records FOR ALL TO authenticated
    USING (facility_id = (auth.jwt() ->> 'facility_id')::uuid)
    WITH CHECK (facility_id = (auth.jwt() ->> 'facility_id')::uuid);
END $$;

-- 権限の付与
GRANT ALL ON medical_coord_iv_records TO authenticated;
GRANT ALL ON medical_coord_v_records TO authenticated;
GRANT ALL ON medical_coord_iv_records TO service_role;
GRANT ALL ON medical_coord_v_records TO service_role;
