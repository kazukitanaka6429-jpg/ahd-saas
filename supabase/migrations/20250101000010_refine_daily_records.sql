-- Phase 3.1: Refine daily_records schema for HQ reporting

-- Add missing columns if they don't exist
-- We use "add column if not exists" logic block usually, but standard SQL doesn't support IF NOT EXISTS for columns easily in one line without DO block.
-- Supabase/Postgres 9.6+ supports IF NOT EXISTS.

ALTER TABLE daily_records 
ADD COLUMN IF NOT EXISTS is_gh_stay boolean DEFAULT false, -- 実績としてのGH泊
ADD COLUMN IF NOT EXISTS is_gh boolean DEFAULT false, -- 日中GH
ADD COLUMN IF NOT EXISTS is_gh_night boolean DEFAULT false, -- 夜勤加配算定
ADD COLUMN IF NOT EXISTS meal_breakfast boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS meal_lunch boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS meal_dinner boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS other_welfare_service text,
ADD COLUMN IF NOT EXISTS emergency_transport boolean DEFAULT false;

-- For daytime_activity, we want to ensure it supports text if user wants text check.
-- If it exists as boolean, we might need to change it.
-- Let's check type. If it's boolean, we change it to text.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'daily_records' AND column_name = 'daytime_activity' AND data_type = 'boolean'
    ) THEN
        ALTER TABLE daily_records ALTER COLUMN daytime_activity TYPE text USING CASE WHEN daytime_activity THEN 'あり' ELSE '' END;
    ELSIF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'daily_records' AND column_name = 'daytime_activity'
    ) THEN
        ALTER TABLE daily_records ADD COLUMN daytime_activity text DEFAULT '';
    END IF;
END $$;
