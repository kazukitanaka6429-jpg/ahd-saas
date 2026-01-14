-- Fix short_stay_records: Add missing unique constraint
-- Error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"

-- First, drop the constraint if it exists with a different name
ALTER TABLE short_stay_records DROP CONSTRAINT IF EXISTS unique_short_stay_per_day;

-- Create the unique constraint
ALTER TABLE short_stay_records 
ADD CONSTRAINT unique_short_stay_per_day UNIQUE (facility_id, date);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
