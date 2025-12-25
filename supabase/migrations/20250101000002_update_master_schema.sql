-- 利用者マスタ (residents) のカラム追加
ALTER TABLE residents ADD COLUMN IF NOT EXISTS direct_debit_start_date DATE; -- 口振開始日
ALTER TABLE residents ADD COLUMN IF NOT EXISTS primary_insurance TEXT;      -- 主保険
ALTER TABLE residents ADD COLUMN IF NOT EXISTS limit_application_class TEXT; -- 限度額適用区分
ALTER TABLE residents ADD COLUMN IF NOT EXISTS public_expense_1 TEXT;       -- 第1公費
ALTER TABLE residents ADD COLUMN IF NOT EXISTS public_expense_2 TEXT;       -- 第2公費
ALTER TABLE residents ADD COLUMN IF NOT EXISTS table_7 BOOLEAN DEFAULT false; -- 別表7
ALTER TABLE residents ADD COLUMN IF NOT EXISTS table_8 BOOLEAN DEFAULT false; -- 別表8
ALTER TABLE residents ADD COLUMN IF NOT EXISTS ventilator BOOLEAN DEFAULT false; -- 人工呼吸器
ALTER TABLE residents ADD COLUMN IF NOT EXISTS classification TEXT;         -- 区分 (1-6)
ALTER TABLE residents ADD COLUMN IF NOT EXISTS severe_disability_addition BOOLEAN DEFAULT false; -- 重度加算
ALTER TABLE residents ADD COLUMN IF NOT EXISTS sputum_suction BOOLEAN DEFAULT false; -- 喀痰吸引

-- 職員マスタ (staffs) のカラム追加
ALTER TABLE staffs ADD COLUMN IF NOT EXISTS join_date DATE;                 -- 入社年月日
ALTER TABLE staffs ADD COLUMN IF NOT EXISTS leave_date DATE;                -- 退社年月日
ALTER TABLE staffs ADD COLUMN IF NOT EXISTS job_types TEXT[];               -- 職種 (複数選択可)
ALTER TABLE staffs ADD COLUMN IF NOT EXISTS qualifications TEXT;            -- 資格
