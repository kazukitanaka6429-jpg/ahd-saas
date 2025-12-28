-- このSQLをSupabaseダッシュボードのSQL Editorで実行してください

CREATE TABLE IF NOT EXISTS short_stay_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id uuid REFERENCES facilities(id) NOT NULL,
  date date NOT NULL,
  
  -- Resident Info (FK to residents table)
  resident_id uuid REFERENCES residents(id),
  
  -- Period Note (e.g. "1/1 ~ 1/3")
  period_note text,
  
  -- Checkboxes (Boolean)
  meal_breakfast boolean DEFAULT false,
  meal_lunch boolean DEFAULT false,
  meal_dinner boolean DEFAULT false,
  is_gh boolean DEFAULT false, -- GH
  is_gh_night boolean DEFAULT false, -- 夜間GH泊
  meal_provided_lunch boolean DEFAULT false, -- 食事提供有(昼)
  
  -- Text/Select Inputs
  daytime_activity text, -- "生活介護", "B型" etc.
  other_welfare_service text, -- "デイサービス", "訪問看護" etc.
  
  -- Time Inputs (Time type)
  entry_time time,
  exit_time time,
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraint: Only 1 Short Stay record per facility per day
  CONSTRAINT unique_short_stay_per_day UNIQUE (facility_id, date)
);

-- RLS Policies
ALTER TABLE short_stay_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users based on facility_id" ON short_stay_records
    FOR ALL
    TO authenticated
    USING (facility_id = (select facility_id from staffs where auth.uid() = staffs.auth_user_id))
    WITH CHECK (facility_id = (select facility_id from staffs where auth.uid() = staffs.auth_user_id));

-- スキーマキャッシュの更新
NOTIFY pgrst, 'reload schema';
