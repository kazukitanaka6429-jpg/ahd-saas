-- Fix short_stay_records RLS for Admin access
-- Error: "Could not find the 'data' column of 'short_stay_records'"
-- Root cause: Admin (facility_id = NULL) cannot access due to RLS policy

-- 1. Create table if not exists (same schema)
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

-- 2. Enable RLS
ALTER TABLE short_stay_records ENABLE ROW LEVEL SECURITY;

-- 3. Drop old policies
DROP POLICY IF EXISTS "Enable all for authenticated users based on facility_id" ON short_stay_records;
DROP POLICY IF EXISTS "Enable all for authorized staff" ON short_stay_records;

-- 4. Create proper policy using can_access_facility (supports Admin + Staff)
CREATE POLICY "Enable all for authorized staff" ON short_stay_records
    FOR ALL
    TO authenticated
    USING (public.can_access_facility(facility_id))
    WITH CHECK (public.can_access_facility(facility_id));

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
