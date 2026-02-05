-- Fix Security Warnings: RLS and Search Path
-- Description:
-- 1. Fixes permissive RLS on `finding_comments` by adding `facility_id` and enforcing access based on it.
-- 2. Fixes mutable search_path warnings on several functions.

-- =========================================================
-- Part 1: Secure `finding_comments`
-- =========================================================

-- 1.1 Add facility_id column
ALTER TABLE finding_comments 
ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES facilities(id);

-- 1.2 Backfill facility_id (Best effort based on links)
DO $$
BEGIN
    -- Backfill from daily_records
    UPDATE finding_comments fc
    SET facility_id = dr.facility_id
    FROM daily_records dr
    WHERE fc.daily_record_id = dr.id
    AND fc.facility_id IS NULL;

    -- Backfill from medical_cooperation_records (via resident)
    -- Assuming medical_cooperation_records exists and links to residents
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medical_cooperation_records') THEN
        UPDATE finding_comments fc
        SET facility_id = r.facility_id
        FROM medical_cooperation_records m
        JOIN residents r ON m.resident_id = r.id
        WHERE fc.medical_record_id = m.id
        AND fc.facility_id IS NULL;
    END IF;

    -- Backfill from short_stay_records
    -- Assuming short_stay_records has facility_id or links to resident
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'short_stay_records') THEN
        -- Check if short_stay_records has facility_id directly (likely)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'short_stay_records' AND column_name = 'facility_id') THEN
             UPDATE finding_comments fc
             SET facility_id = s.facility_id
             FROM short_stay_records s
             WHERE fc.short_stay_record_id = s.id
             AND fc.facility_id IS NULL;
        END IF;
    END IF;
END $$;

-- 1.3 Create Trigger to automatically set facility_id on Insert
CREATE OR REPLACE FUNCTION public.set_finding_comment_facility_id()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.facility_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Try to fetch from daily_records
    IF NEW.daily_record_id IS NOT NULL THEN
        SELECT facility_id INTO NEW.facility_id FROM daily_records WHERE id = NEW.daily_record_id;
    
    -- Try to fetch from medical_cooperation_records
    ELSIF NEW.medical_record_id IS NOT NULL THEN
        SELECT r.facility_id INTO NEW.facility_id 
        FROM medical_cooperation_records m
        JOIN residents r ON m.resident_id = r.id
        WHERE m.id = NEW.medical_record_id;

    -- Try to fetch from short_stay_records
    ELSIF NEW.short_stay_record_id IS NOT NULL THEN
        -- Check structure dynamically?? No, PL/SQL needs static. 
        -- We assume short_stay_records has facility_id as per standard schema.
        -- If not, this might fail or return null. 
        SELECT facility_id INTO NEW.facility_id FROM short_stay_records WHERE id = NEW.short_stay_record_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_finding_comment_facility_id ON finding_comments;

CREATE TRIGGER trigger_set_finding_comment_facility_id
BEFORE INSERT ON finding_comments
FOR EACH ROW
EXECUTE FUNCTION public.set_finding_comment_facility_id();

-- 1.4 Update RLS Policies
ALTER TABLE finding_comments ENABLE ROW LEVEL SECURITY;

-- Drop insecure policies
DROP POLICY IF EXISTS "Enable all for authenticated users" ON finding_comments;
DROP POLICY IF EXISTS "Enable all for authorized staff" ON finding_comments;

-- Create secure policies
-- View: Access if user belongs to the same facility (or is admin of org managing facility)
CREATE POLICY "finding_comments_select" ON finding_comments
FOR SELECT TO authenticated
USING (
    public.can_access_facility(facility_id)
);

-- Insert: Allow if user has access to the facility (Trigger will set it, but user must have rights)
-- We rely on the Trigger setting it on the NEW row, then RLS checks it.
CREATE POLICY "finding_comments_insert" ON finding_comments
FOR INSERT TO authenticated
WITH CHECK (
    public.can_access_facility(facility_id)
);

-- Update/Delete: Own comments or Admin? 
-- Usually user can only delete their own comments or admins can delete.
CREATE POLICY "finding_comments_update_own" ON finding_comments
FOR UPDATE TO authenticated
USING (
    author_id IN (SELECT id FROM staffs WHERE auth_user_id = auth.uid())
)
WITH CHECK (
    author_id IN (SELECT id FROM staffs WHERE auth_user_id = auth.uid())
);

CREATE POLICY "finding_comments_delete_own" ON finding_comments
FOR DELETE TO authenticated
USING (
    author_id IN (SELECT id FROM staffs WHERE auth_user_id = auth.uid())
);

-- =========================================================
-- Part 2: Fix Mutable search_path in Functions
-- =========================================================

-- 2.1 get_my_organization_id
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM staffs
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- 2.2 update_doc_history_updated_at
CREATE OR REPLACE FUNCTION public.update_doc_history_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- 2.3 trigger_set_updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- 2.4 update_daily_records_updated_at
CREATE OR REPLACE FUNCTION public.update_daily_records_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;
