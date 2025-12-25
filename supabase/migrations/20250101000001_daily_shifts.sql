-- 出勤状況保存用テーブル
-- 1日1レコードで、JSONB配列として各時間帯の職員IDリストを保持します。

CREATE TABLE daily_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID NOT NULL REFERENCES facilities(id),
    date DATE NOT NULL,
    
    day_staff_ids JSONB DEFAULT '[]',      -- 日勤職員IDリスト
    evening_staff_ids JSONB DEFAULT '[]',  -- 夕勤職員IDリスト
    night_staff_ids JSONB DEFAULT '[]',    -- 夜勤職員IDリスト
    night_shift_plus BOOLEAN DEFAULT false, -- 夜勤加算フラグ
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(facility_id, date) -- 同じ施設・同じ日に重複レコードを作らせない
);

-- 検索性を高めるためのインデックス（日付検索用）
CREATE INDEX idx_daily_shifts_facility_date ON daily_shifts(facility_id, date);
