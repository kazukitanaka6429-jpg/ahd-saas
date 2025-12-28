
-- Phase 7.2: Support Findings for Short Stay Records

-- 1. Add short_stay_record_id to finding_comments
ALTER TABLE finding_comments
ADD COLUMN IF NOT EXISTS short_stay_record_id UUID REFERENCES short_stay_records(id) ON DELETE CASCADE;

-- 2. Update the constraint to ensure only one record_id is set
ALTER TABLE finding_comments
DROP CONSTRAINT IF EXISTS finding_comments_target_check;

ALTER TABLE finding_comments
ADD CONSTRAINT finding_comments_target_check CHECK (
    (daily_record_id IS NOT NULL AND medical_record_id IS NULL AND short_stay_record_id IS NULL) OR
    (daily_record_id IS NULL AND medical_record_id IS NOT NULL AND short_stay_record_id IS NULL) OR
    (daily_record_id IS NULL AND medical_record_id IS NULL AND short_stay_record_id IS NOT NULL)
);

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_finding_comments_short_stay_record ON finding_comments(short_stay_record_id);

-- Cleanup: Remove Dummy Simulation Users and their data
-- Must delete child records first to avoid FK violations
-- Note: finding_comments should cascade delete if they reference these records generally, 
-- but if finding_comments references daily_records and daily_records cascade delete on resident delete...
-- Standard daily_records likely references residents.

DELETE FROM daily_records WHERE resident_id IN (SELECT id FROM residents WHERE name LIKE 'User % (Sim)');
DELETE FROM short_stay_records WHERE resident_id IN (SELECT id FROM residents WHERE name LIKE 'User % (Sim)');
DELETE FROM medical_cooperation_records WHERE resident_id IN (SELECT id FROM residents WHERE name LIKE 'User % (Sim)');

-- Finally delete the residents
DELETE FROM residents WHERE name LIKE 'User % (Sim)';
