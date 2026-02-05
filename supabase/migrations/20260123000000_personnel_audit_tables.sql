-- Personnel Audit Tables
-- 2026-01-23

-- 1. 勤怠実績テーブル (Kintai CSV)
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID REFERENCES facilities(id) NOT NULL,
    
    staff_name TEXT NOT NULL, -- CSV source name
    work_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_time_minutes INTEGER DEFAULT 60,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(facility_id, staff_name, work_date, start_time)
);

-- 2. スポットバイト情報テーブル (Kaitekku CSV)
CREATE TABLE IF NOT EXISTS spot_job_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID REFERENCES facilities(id) NOT NULL,
    
    job_apply_id TEXT, -- 案件応募ID (Unique key candidate)
    job_id TEXT,       -- 案件ID
    
    staff_name TEXT NOT NULL, -- ワーカー名
    provider TEXT NOT NULL,   -- 'Kaitekku' etc.

    work_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(facility_id, job_apply_id) -- Prevent duplicate imports based on Apply ID
);

-- 3. 訪問看護実績テーブル (Nursing CSV)
CREATE TABLE IF NOT EXISTS visiting_nursing_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID REFERENCES facilities(id) NOT NULL,
    
    resident_name TEXT, -- 利用者名
    visit_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    nursing_staff_name TEXT NOT NULL, -- 主訪問者
    secondary_nursing_staff_name_1 TEXT, -- 副訪問者1
    secondary_nursing_staff_name_2 TEXT, -- 副訪問者2
    secondary_nursing_staff_name_3 TEXT, -- 副訪問者3
    
    service_type TEXT, -- サービス内容 (e.g. 訪問看護)

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    
    -- No unique constraint easily defined as same staff might visit same resident twice? 
    -- Or resident visited twice? 
    -- Let's leave unique constraint flexible or define later.
);

-- 4. 手動勤務登録テーブル (Manual Work Entry)
-- 監査画面から手動で追加された勤務データ
CREATE TABLE IF NOT EXISTS manual_work_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID REFERENCES facilities(id) NOT NULL,
    
    staff_id UUID REFERENCES staffs(id), -- Nullable if we allow "Unregistered Staff"? Ideally linked.
    target_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    is_night_shift BOOLEAN DEFAULT false, -- Helping UI logic
    note TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 手動控除テーブル (Manual Deduction)
-- 監査画面から手動で追加された控除データ（休憩、その他）
CREATE TABLE IF NOT EXISTS manual_deductions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID REFERENCES facilities(id) NOT NULL,
    
    staff_id UUID REFERENCES staffs(id),
    target_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    reason TEXT, -- 'Break', 'Medical IV', etc.

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- RLS Policies
-- Enable RLS
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE spot_job_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE visiting_nursing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_work_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_deductions ENABLE ROW LEVEL SECURITY;

-- 1. Attendance Records
CREATE POLICY "Enable all for authenticated users based on facility_id" ON attendance_records
FOR ALL TO authenticated
USING (facility_id = (auth.jwt() ->> 'facility_id')::uuid)
WITH CHECK (facility_id = (auth.jwt() ->> 'facility_id')::uuid);

-- 2. Spot Job Records
CREATE POLICY "Enable all for authenticated users based on facility_id" ON spot_job_records
FOR ALL TO authenticated
USING (facility_id = (auth.jwt() ->> 'facility_id')::uuid)
WITH CHECK (facility_id = (auth.jwt() ->> 'facility_id')::uuid);

-- 3. Visiting Nursing Records
CREATE POLICY "Enable all for authenticated users based on facility_id" ON visiting_nursing_records
FOR ALL TO authenticated
USING (facility_id = (auth.jwt() ->> 'facility_id')::uuid)
WITH CHECK (facility_id = (auth.jwt() ->> 'facility_id')::uuid);

-- 4. Manual Work Records
CREATE POLICY "Enable all for authenticated users based on facility_id" ON manual_work_records
FOR ALL TO authenticated
USING (facility_id = (auth.jwt() ->> 'facility_id')::uuid)
WITH CHECK (facility_id = (auth.jwt() ->> 'facility_id')::uuid);

-- 5. Manual Deductions
CREATE POLICY "Enable all for authenticated users based on facility_id" ON manual_deductions
FOR ALL TO authenticated
USING (facility_id = (auth.jwt() ->> 'facility_id')::uuid)
WITH CHECK (facility_id = (auth.jwt() ->> 'facility_id')::uuid);
