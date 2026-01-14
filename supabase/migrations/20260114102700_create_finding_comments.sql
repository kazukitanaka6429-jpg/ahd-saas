-- Create finding_comments table if it doesn't exist
-- Error: "Could not find the table 'public.finding_comments' in the schema cache"
-- Note: daily_records may be a view, so using plain UUID columns without FK references

-- 1. Create base table (without FK constraints to avoid view reference issues)
CREATE TABLE IF NOT EXISTS finding_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_record_id uuid,  -- No FK reference (daily_records might be a view)
  medical_record_id uuid,  -- Optional: REFERENCES medical_cooperation_records(id) ON DELETE CASCADE
  short_stay_record_id uuid,  -- Optional: REFERENCES short_stay_records(id) ON DELETE CASCADE
  
  -- Identifies the specific cell/field (e.g., "meal_breakfast" or "vitals.temp")
  json_path text NOT NULL,
  
  comment text NOT NULL,
  author_id uuid,  -- No FK reference to avoid issues
  author_name text NOT NULL,
  
  is_resolved boolean DEFAULT false,
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add check constraint (only one record type reference is allowed)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'finding_comments_target_check'
    ) THEN
        ALTER TABLE finding_comments ADD CONSTRAINT finding_comments_target_check CHECK (
            (daily_record_id IS NOT NULL AND medical_record_id IS NULL AND short_stay_record_id IS NULL) OR
            (daily_record_id IS NULL AND medical_record_id IS NOT NULL AND short_stay_record_id IS NULL) OR
            (daily_record_id IS NULL AND medical_record_id IS NULL AND short_stay_record_id IS NOT NULL)
        );
    END IF;
END $$;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_finding_comments_record ON finding_comments(daily_record_id);
CREATE INDEX IF NOT EXISTS idx_finding_comments_medical_record ON finding_comments(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_finding_comments_short_stay_record ON finding_comments(short_stay_record_id);

-- 4. Enable RLS
ALTER TABLE finding_comments ENABLE ROW LEVEL SECURITY;

-- 5. Drop old policies
DROP POLICY IF EXISTS "Enable all for authenticated users" ON finding_comments;
DROP POLICY IF EXISTS "Enable all for authorized staff" ON finding_comments;

-- 6. Create permissive policy (all authenticated users can access)
CREATE POLICY "Enable all for authenticated users" ON finding_comments 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
