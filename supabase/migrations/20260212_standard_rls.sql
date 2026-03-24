-- ============================================================
-- Apply Standard RLS Policy (can_access_facility) to Daily Records
-- ============================================================
-- Purpose: Unify RLS logic using `can_access_facility` instead of ad-hoc organization checks.
-- This ensures that Managers can only see records for their facility, while HQ (Admins) can see all.

BEGIN;

-- Helper to apply policy to a daily_record partition
-- We drop existing policies to replace them with the standard one.

DO $$
DECLARE
    tables TEXT[] := ARRAY[
        'daily_records_default',
        'daily_records_2024',
        'daily_records_2025',
        'daily_records_2026',
        'daily_records_2027'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        -- 1. Drop old organization-based policies
        EXECUTE format('DROP POLICY IF EXISTS "daily_records_select_policy" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "daily_records_insert_policy" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "daily_records_update_policy" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "daily_records_delete_policy" ON public.%I', tbl);
        
        -- 2. Create new Unified Policy
        -- Note: daily_records has 'facility_id' column, so we pass that to can_access_facility.
        
        EXECUTE format('
            CREATE POLICY "daily_records_standard_policy" ON public.%I
            FOR ALL TO authenticated
            USING (public.can_access_facility(facility_id))
            WITH CHECK (public.can_access_facility(facility_id))
        ', tbl);
        
        -- 3. Ensure RLS is enabled
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
        
        RAISE NOTICE 'Applied standard RLS to %', tbl;
    END LOOP;
END $$;

COMMIT;
