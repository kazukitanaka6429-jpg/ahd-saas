-- 以前のマイグレーション(20250101000008_short_stay_v2.sql)にバグ(auth_user_idではなくuser_idを参照)があり、
-- テーブル作成がロールバックされたか、ポリシー作成に失敗している可能性が高いため、
-- 確実にテーブルを作成し、正しいポリシーを適用するマイグレーションです。

-- 1. テーブル作成 (存在しない場合のみ)
CREATE TABLE IF NOT EXISTS short_stay_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id uuid REFERENCES facilities(id) NOT NULL,
  date date NOT NULL,
  
  -- Resident Info
  resident_id uuid REFERENCES residents(id),
  
  -- Period Note
  period_note text,
  
  -- Checkboxes
  meal_breakfast boolean DEFAULT false,
  meal_lunch boolean DEFAULT false,
  meal_dinner boolean DEFAULT false,
  is_gh boolean DEFAULT false,
  is_gh_night boolean DEFAULT false,
  meal_provided_lunch boolean DEFAULT false,
  
  -- Inputs
  daytime_activity text,
  other_welfare_service text,
  
  -- Time
  entry_time time,
  exit_time time,
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraint
  CONSTRAINT unique_short_stay_per_day UNIQUE (facility_id, date)
);

-- 2. RLS有効化
ALTER TABLE short_stay_records ENABLE ROW LEVEL SECURITY;

-- 3. 古い/壊れたポリシーがあれば削除 (テーブルが存在する場合にエラーにならないよう安全に再作成)
DROP POLICY IF EXISTS "Enable all for authenticated users based on facility_id" ON short_stay_records;

-- 4. 正しいポリシーを作成 (staffs.auth_user_id を使用)
CREATE POLICY "Enable all for authenticated users based on facility_id" ON short_stay_records
    FOR ALL
    TO authenticated
    USING (facility_id = (select facility_id from staffs where auth.uid() = staffs.auth_user_id))
    WITH CHECK (facility_id = (select facility_id from staffs where auth.uid() = staffs.auth_user_id));

-- スキーマキャッシュの更新
NOTIFY pgrst, 'reload schema';
