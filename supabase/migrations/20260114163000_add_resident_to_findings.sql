-- Add resident_id column to finding_comments for HQ Daily Check resident memos
-- This allows comments to be attached directly to residents (not just records)

-- 1. Add resident_id column
ALTER TABLE finding_comments 
ADD COLUMN IF NOT EXISTS resident_id uuid;

-- 2. Create index
CREATE INDEX IF NOT EXISTS idx_finding_comments_resident ON finding_comments(resident_id);

-- 3. Update check constraint to allow resident_id
-- First drop the old constraint
ALTER TABLE finding_comments DROP CONSTRAINT IF EXISTS finding_comments_target_check;

-- Then add the updated constraint
ALTER TABLE finding_comments ADD CONSTRAINT finding_comments_target_check CHECK (
    (daily_record_id IS NOT NULL AND medical_record_id IS NULL AND short_stay_record_id IS NULL AND medical_v_daily_id IS NULL AND medical_v_record_id IS NULL AND resident_id IS NULL) OR
    (daily_record_id IS NULL AND medical_record_id IS NOT NULL AND short_stay_record_id IS NULL AND medical_v_daily_id IS NULL AND medical_v_record_id IS NULL AND resident_id IS NULL) OR
    (daily_record_id IS NULL AND medical_record_id IS NULL AND short_stay_record_id IS NOT NULL AND medical_v_daily_id IS NULL AND medical_v_record_id IS NULL AND resident_id IS NULL) OR
    (daily_record_id IS NULL AND medical_record_id IS NULL AND short_stay_record_id IS NULL AND medical_v_daily_id IS NOT NULL AND medical_v_record_id IS NULL AND resident_id IS NULL) OR
    (daily_record_id IS NULL AND medical_record_id IS NULL AND short_stay_record_id IS NULL AND medical_v_daily_id IS NULL AND medical_v_record_id IS NOT NULL AND resident_id IS NULL) OR
    (daily_record_id IS NULL AND medical_record_id IS NULL AND short_stay_record_id IS NULL AND medical_v_daily_id IS NULL AND medical_v_record_id IS NULL AND resident_id IS NOT NULL)
);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
