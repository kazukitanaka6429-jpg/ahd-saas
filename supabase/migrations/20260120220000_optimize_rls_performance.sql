-- ============================================================
-- RLS Performance Optimization Migration
-- ============================================================
-- Purpose: Resolve Supabase Performance Advisor warnings
-- 1. auth_rls_initplan: Replace auth.uid() with (select auth.uid())
-- 2. multiple_permissive_policies: Consolidate duplicate policies
--
-- IMPORTANT: This migration does NOT change access control logic.
-- It only optimizes the execution pattern for better performance.
-- ============================================================

BEGIN;

-- ============================================================
-- HELPER FUNCTIONS (Optimized with (select auth.uid()))
-- ============================================================

-- Recreate my_org_id() with optimized auth.uid() call
CREATE OR REPLACE FUNCTION public.my_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM staffs
  WHERE auth_user_id = (select auth.uid())
  LIMIT 1;
$$;

-- Recreate is_org_admin() with optimized auth.uid() call
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staffs
    WHERE auth_user_id = (select auth.uid())
    AND organization_id = org_id
    AND role = 'admin'
  );
$$;

-- Recreate is_any_admin() with optimized auth.uid() call
CREATE OR REPLACE FUNCTION public.is_any_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staffs
    WHERE auth_user_id = (select auth.uid())
    AND role = 'admin'
  );
$$;

-- Recreate can_access_facility() with optimized auth.uid() call
CREATE OR REPLACE FUNCTION public.can_access_facility(fid UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_org UUID;
    user_role TEXT;
    user_fac UUID;
    target_org UUID;
    cached_uid UUID;
BEGIN
    -- Cache auth.uid() to avoid repeated calls
    cached_uid := (select auth.uid());
    
    SELECT organization_id, role, facility_id INTO user_org, user_role, user_fac
    FROM staffs WHERE auth_user_id = cached_uid LIMIT 1;
    
    IF user_org IS NULL THEN RETURN false; END IF;
    
    SELECT organization_id INTO target_org FROM facilities WHERE id = fid;
    
    IF user_role = 'admin' THEN
        RETURN user_org = target_org;
    END IF;
    
    RETURN user_fac = fid;
END;
$$;

-- ============================================================
-- 1. DAILY_SHIFTS - Fix auth_rls_initplan + multiple_permissive
-- ============================================================
DROP POLICY IF EXISTS "daily_shifts_select_own_org" ON daily_shifts;
DROP POLICY IF EXISTS "daily_shifts_modify_own_facility" ON daily_shifts;

-- Consolidated SELECT policy (merges both policies with OR)
CREATE POLICY "daily_shifts_select_optimized" ON daily_shifts
    FOR SELECT TO authenticated
    USING (public.can_access_facility(facility_id));

-- Consolidated INSERT/UPDATE/DELETE policy
CREATE POLICY "daily_shifts_modify_optimized" ON daily_shifts
    FOR ALL TO authenticated
    USING (public.can_access_facility(facility_id))
    WITH CHECK (public.can_access_facility(facility_id));

-- ============================================================
-- 2. OPERATION_LOGS - Fix auth_rls_initplan
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON operation_logs;
DROP POLICY IF EXISTS "Admins can view logs for their organization" ON operation_logs;

CREATE POLICY "operation_logs_insert_optimized" ON operation_logs
    FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "operation_logs_select_optimized" ON operation_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staffs s
            WHERE s.auth_user_id = (select auth.uid())
            AND s.role = 'admin'
            AND s.organization_id = operation_logs.organization_id
        )
    );

-- ============================================================
-- 3. ORGANIZATIONS - Fix auth_rls_initplan
-- ============================================================
DROP POLICY IF EXISTS "organizations_select_own" ON organizations;

CREATE POLICY "organizations_select_optimized" ON organizations
    FOR SELECT TO authenticated
    USING (
        id IN (
            SELECT organization_id FROM staffs
            WHERE auth_user_id = (select auth.uid())
        )
    );

-- ============================================================
-- 4. FACILITIES - Fix auth_rls_initplan
-- ============================================================
DROP POLICY IF EXISTS "facilities_select_own_org" ON facilities;
DROP POLICY IF EXISTS "facilities_insert_admin" ON facilities;
DROP POLICY IF EXISTS "facilities_update_admin" ON facilities;
DROP POLICY IF EXISTS "facilities_delete_admin" ON facilities;
DROP POLICY IF EXISTS "Admins can read all facilities" ON facilities;
DROP POLICY IF EXISTS "Staff can read own facility" ON facilities;

CREATE POLICY "facilities_select_optimized" ON facilities
    FOR SELECT TO authenticated
    USING (public.can_access_facility(id));

CREATE POLICY "facilities_insert_optimized" ON facilities
    FOR INSERT TO authenticated
    WITH CHECK (public.is_any_admin());

CREATE POLICY "facilities_update_optimized" ON facilities
    FOR UPDATE TO authenticated
    USING (public.is_any_admin())
    WITH CHECK (public.is_any_admin());

CREATE POLICY "facilities_delete_optimized" ON facilities
    FOR DELETE TO authenticated
    USING (public.is_any_admin());

-- ============================================================
-- 5. STAFFS - Fix auth_rls_initplan + multiple_permissive
-- ============================================================
DROP POLICY IF EXISTS "staffs_select_self" ON staffs;
DROP POLICY IF EXISTS "staffs_select_same_org" ON staffs;
DROP POLICY IF EXISTS "Users can read own staff records" ON staffs;
DROP POLICY IF EXISTS "Admins can read organization staff records" ON staffs;
DROP POLICY IF EXISTS "Managers/Staff can read facility staff records" ON staffs;
DROP POLICY IF EXISTS "staffs_insert_admin_manager" ON staffs;
DROP POLICY IF EXISTS "staffs_update_admin_manager" ON staffs;
DROP POLICY IF EXISTS "staffs_delete_admin" ON staffs;

-- Consolidated SELECT: self OR same org (for admin) OR same facility
CREATE POLICY "staffs_select_optimized" ON staffs
    FOR SELECT TO authenticated
    USING (
        auth_user_id = (select auth.uid())
        OR public.is_org_admin(organization_id)
        OR facility_id IN (
            SELECT facility_id FROM staffs
            WHERE auth_user_id = (select auth.uid()) AND facility_id IS NOT NULL
        )
    );

CREATE POLICY "staffs_insert_optimized" ON staffs
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM staffs s
            WHERE s.auth_user_id = (select auth.uid())
            AND (s.role = 'admin' OR s.role = 'manager')
            AND s.organization_id = staffs.organization_id
        )
    );

CREATE POLICY "staffs_update_optimized" ON staffs
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staffs s
            WHERE s.auth_user_id = (select auth.uid())
            AND (s.role = 'admin' OR s.role = 'manager')
            AND s.organization_id = staffs.organization_id
        )
    );

CREATE POLICY "staffs_delete_optimized" ON staffs
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staffs s
            WHERE s.auth_user_id = (select auth.uid())
            AND s.role = 'admin'
            AND s.organization_id = staffs.organization_id
        )
    );

-- ============================================================
-- 6. STAFF_FACILITIES - Fix auth_rls_initplan + multiple_permissive
-- ============================================================
DROP POLICY IF EXISTS "staff_facilities_select_own_org" ON staff_facilities;
DROP POLICY IF EXISTS "staff_facilities_modify_admin_manager" ON staff_facilities;

-- Consolidated SELECT policy
CREATE POLICY "staff_facilities_select_optimized" ON staff_facilities
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staffs s
            WHERE s.auth_user_id = (select auth.uid())
            AND s.organization_id IN (
                SELECT organization_id FROM staffs WHERE id = staff_facilities.staff_id
            )
        )
    );

CREATE POLICY "staff_facilities_modify_optimized" ON staff_facilities
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staffs s
            WHERE s.auth_user_id = (select auth.uid())
            AND (s.role = 'admin' OR s.role = 'manager')
            AND s.organization_id IN (
                SELECT organization_id FROM staffs WHERE id = staff_facilities.staff_id
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM staffs s
            WHERE s.auth_user_id = (select auth.uid())
            AND (s.role = 'admin' OR s.role = 'manager')
            AND s.organization_id IN (
                SELECT organization_id FROM staffs WHERE id = staff_facilities.staff_id
            )
        )
    );

-- ============================================================
-- 7. RESIDENTS - Fix auth_rls_initplan
-- ============================================================
DROP POLICY IF EXISTS "residents_select_own_org" ON residents;
DROP POLICY IF EXISTS "residents_insert_facility_or_admin" ON residents;
DROP POLICY IF EXISTS "residents_update_facility_or_admin" ON residents;
DROP POLICY IF EXISTS "residents_delete_admin" ON residents;
DROP POLICY IF EXISTS "Admins can read all residents" ON residents;
DROP POLICY IF EXISTS "Staff can read facility residents" ON residents;
DROP POLICY IF EXISTS "Admins can insert residents" ON residents;
DROP POLICY IF EXISTS "Admins can update residents" ON residents;
DROP POLICY IF EXISTS "Admins can delete residents" ON residents;

CREATE POLICY "residents_select_optimized" ON residents
    FOR SELECT TO authenticated
    USING (public.can_access_facility(facility_id));

CREATE POLICY "residents_insert_optimized" ON residents
    FOR INSERT TO authenticated
    WITH CHECK (public.can_access_facility(facility_id) OR public.is_any_admin());

CREATE POLICY "residents_update_optimized" ON residents
    FOR UPDATE TO authenticated
    USING (public.can_access_facility(facility_id) OR public.is_any_admin());

CREATE POLICY "residents_delete_optimized" ON residents
    FOR DELETE TO authenticated
    USING (public.is_any_admin());

-- ============================================================
-- 8. MEDICAL_COOPERATION_RECORDS - Fix auth_rls_initplan + multiple_permissive
-- ============================================================
DROP POLICY IF EXISTS "medical_cooperation_records_select_own_org" ON medical_cooperation_records;
DROP POLICY IF EXISTS "medical_cooperation_records_modify_own_facility" ON medical_cooperation_records;
DROP POLICY IF EXISTS "Enable all for authorized staff" ON medical_cooperation_records;

CREATE POLICY "medical_cooperation_records_optimized" ON medical_cooperation_records
    FOR ALL TO authenticated
    USING (public.can_access_facility(facility_id))
    WITH CHECK (public.can_access_facility(facility_id));

-- ============================================================
-- 9. SHORT_STAY_RECORDS - Fix auth_rls_initplan + multiple_permissive
-- ============================================================
DROP POLICY IF EXISTS "short_stay_records_select_own_org" ON short_stay_records;
DROP POLICY IF EXISTS "short_stay_records_modify_own_facility" ON short_stay_records;
DROP POLICY IF EXISTS "Enable all for authorized staff" ON short_stay_records;

CREATE POLICY "short_stay_records_optimized" ON short_stay_records
    FOR ALL TO authenticated
    USING (public.can_access_facility(facility_id))
    WITH CHECK (public.can_access_facility(facility_id));

-- ============================================================
-- 10. EXTERNAL_BILLING_IMPORTS - Fix auth_rls_initplan + multiple_permissive
-- ============================================================
DROP POLICY IF EXISTS "external_billing_imports_select_own_org" ON external_billing_imports;
DROP POLICY IF EXISTS "external_billing_imports_modify_admin" ON external_billing_imports;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON external_billing_imports;

-- Use facility_id based access (table has facility_id, not organization_id)
CREATE POLICY "external_billing_imports_optimized" ON external_billing_imports
    FOR ALL TO authenticated
    USING (public.can_access_facility(facility_id))
    WITH CHECK (public.can_access_facility(facility_id));

-- ============================================================
-- 11. MEDICAL_COORD_IV_RECORDS - Fix auth_rls_initplan + multiple_permissive
-- ============================================================
DROP POLICY IF EXISTS "Enable all for authenticated users based on facility_id" ON medical_coord_iv_records;
DROP POLICY IF EXISTS "medical_iv_select_policy" ON medical_coord_iv_records;
DROP POLICY IF EXISTS "medical_iv_insert_policy" ON medical_coord_iv_records;
DROP POLICY IF EXISTS "medical_iv_update_policy" ON medical_coord_iv_records;
DROP POLICY IF EXISTS "medical_iv_delete_policy" ON medical_coord_iv_records;

CREATE POLICY "medical_coord_iv_records_optimized" ON medical_coord_iv_records
    FOR ALL TO authenticated
    USING (public.can_access_facility(facility_id))
    WITH CHECK (public.can_access_facility(facility_id));

-- ============================================================
-- 12. MEDICAL_COORD_V_DAILY - Fix auth_rls_initplan + multiple_permissive
-- ============================================================
DROP POLICY IF EXISTS "Enable all for authenticated users based on facility_id" ON medical_coord_v_daily;
DROP POLICY IF EXISTS "Enable all for authorized staff" ON medical_coord_v_daily;

CREATE POLICY "medical_coord_v_daily_optimized" ON medical_coord_v_daily
    FOR ALL TO authenticated
    USING (public.can_access_facility(facility_id))
    WITH CHECK (public.can_access_facility(facility_id));

-- ============================================================
-- 13. MEDICAL_COORD_V_RECORDS (Parent + Partitions)
-- Fix auth_rls_initplan + multiple_permissive
-- ============================================================

-- Parent table
DROP POLICY IF EXISTS "Enable all for authenticated users based on facility_id" ON medical_coord_v_records;
DROP POLICY IF EXISTS "Enable all for authorized staff flat" ON medical_coord_v_records;

CREATE POLICY "medical_coord_v_records_optimized" ON medical_coord_v_records
    FOR ALL TO authenticated
    USING (public.can_access_facility(facility_id))
    WITH CHECK (public.can_access_facility(facility_id));

-- Partition: _default
DROP POLICY IF EXISTS "Enable all for authenticated users based on facility_id" ON medical_coord_v_records_default;
DROP POLICY IF EXISTS "Enable all for authorized staff flat" ON medical_coord_v_records_default;

CREATE POLICY "medical_coord_v_records_default_optimized" ON medical_coord_v_records_default
    FOR ALL TO authenticated
    USING (public.can_access_facility(facility_id))
    WITH CHECK (public.can_access_facility(facility_id));

-- Partition: 2024
DROP POLICY IF EXISTS "Enable all for authenticated users based on facility_id" ON medical_coord_v_records_2024;
DROP POLICY IF EXISTS "Enable all for authorized staff flat" ON medical_coord_v_records_2024;

CREATE POLICY "medical_coord_v_records_2024_optimized" ON medical_coord_v_records_2024
    FOR ALL TO authenticated
    USING (public.can_access_facility(facility_id))
    WITH CHECK (public.can_access_facility(facility_id));

-- Partition: 2025
DROP POLICY IF EXISTS "Enable all for authenticated users based on facility_id" ON medical_coord_v_records_2025;
DROP POLICY IF EXISTS "Enable all for authorized staff flat" ON medical_coord_v_records_2025;

CREATE POLICY "medical_coord_v_records_2025_optimized" ON medical_coord_v_records_2025
    FOR ALL TO authenticated
    USING (public.can_access_facility(facility_id))
    WITH CHECK (public.can_access_facility(facility_id));

-- Partition: 2026
DROP POLICY IF EXISTS "Enable all for authenticated users based on facility_id" ON medical_coord_v_records_2026;
DROP POLICY IF EXISTS "Enable all for authorized staff flat" ON medical_coord_v_records_2026;

CREATE POLICY "medical_coord_v_records_2026_optimized" ON medical_coord_v_records_2026
    FOR ALL TO authenticated
    USING (public.can_access_facility(facility_id))
    WITH CHECK (public.can_access_facility(facility_id));

-- Partition: 2027
DROP POLICY IF EXISTS "Enable all for authenticated users based on facility_id" ON medical_coord_v_records_2027;
DROP POLICY IF EXISTS "Enable all for authorized staff flat" ON medical_coord_v_records_2027;

CREATE POLICY "medical_coord_v_records_2027_optimized" ON medical_coord_v_records_2027
    FOR ALL TO authenticated
    USING (public.can_access_facility(facility_id))
    WITH CHECK (public.can_access_facility(facility_id));

-- ============================================================
-- Refresh PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';

COMMIT;
