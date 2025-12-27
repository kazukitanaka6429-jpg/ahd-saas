
-- Phase 6: Generalize finding_comments for Medical Cooperation

-- 1. Add medical_record_id column
ALTER TABLE finding_comments 
ADD COLUMN IF NOT EXISTS medical_record_id uuid REFERENCES medical_cooperation_records(id) ON DELETE CASCADE;

-- 2. Make daily_record_id nullable
ALTER TABLE finding_comments 
ALTER COLUMN daily_record_id DROP NOT NULL;

-- 3. Add Check Constraint (One of them must be set)
-- Note: complex logic, but simple check is enough strictly speaking.
ALTER TABLE finding_comments 
ADD CONSTRAINT finding_comments_target_check 
CHECK (
  (daily_record_id IS NOT NULL AND medical_record_id IS NULL) OR 
  (daily_record_id IS NULL AND medical_record_id IS NOT NULL)
);

-- 4. Create Index for performance
CREATE INDEX IF NOT EXISTS idx_finding_comments_medical_record ON finding_comments(medical_record_id);

-- 5. Update RLS (if strict policies needed, but currently "Enable all key authenticated" covers it)
-- Just ensuring the column is accessible is enough if policy is "TO public USING (auth.role() = 'authenticated')"
