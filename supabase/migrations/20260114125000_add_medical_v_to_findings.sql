-- Add Medical V support to finding_comments table
-- Adds columns for medical_v_daily_id and medical_v_record_id

-- 1. Add new columns
ALTER TABLE finding_comments 
ADD COLUMN IF NOT EXISTS medical_v_daily_id uuid;

ALTER TABLE finding_comments 
ADD COLUMN IF NOT EXISTS medical_v_record_id uuid;

-- 2. Update check constraint to include new columns
ALTER TABLE finding_comments DROP CONSTRAINT IF EXISTS finding_comments_target_check;

ALTER TABLE finding_comments ADD CONSTRAINT finding_comments_target_check CHECK (
    -- Exactly one of these must be set
    (
        CASE WHEN daily_record_id IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN medical_record_id IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN short_stay_record_id IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN medical_v_daily_id IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN medical_v_record_id IS NOT NULL THEN 1 ELSE 0 END
    ) = 1
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_finding_comments_medical_v_daily ON finding_comments(medical_v_daily_id);
CREATE INDEX IF NOT EXISTS idx_finding_comments_medical_v_record ON finding_comments(medical_v_record_id);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
