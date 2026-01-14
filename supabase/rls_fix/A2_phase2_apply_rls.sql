-- =============================================================================
-- A2_phase2_apply_rls.sql
-- パーティション子テーブルRLS適用 - Phase 2（_2024, _2025, _2026）
-- =============================================================================
-- 
-- 【重要】このファイルは Phase 1 完了後に実行してください
-- 
-- 【Phase 2 対象】
-- - daily_records_2024, daily_records_2025, daily_records_2026
-- - medical_coord_v_records_2024, medical_coord_v_records_2025, medical_coord_v_records_2026
-- 
-- 【前提条件】
-- 1. A1_phase1_apply_rls.sql が正常に完了している
-- 2. B_verify_rls.sql で RLS有効化とポリシー一致を確認済み
-- 3. アプリで業務日誌/医療連携Vが正常動作することを確認済み
-- =============================================================================

BEGIN;

-- =============================================================================
-- daily_records_2024
-- =============================================================================
DROP POLICY IF EXISTS "daily_records_select_policy" ON public.daily_records_2024;
DROP POLICY IF EXISTS "daily_records_insert_policy" ON public.daily_records_2024;
DROP POLICY IF EXISTS "daily_records_update_policy" ON public.daily_records_2024;
DROP POLICY IF EXISTS "daily_records_delete_policy" ON public.daily_records_2024;

CREATE POLICY "daily_records_select_policy" ON public.daily_records_2024
    FOR SELECT TO authenticated
    USING (organization_id = get_my_organization_id());

CREATE POLICY "daily_records_insert_policy" ON public.daily_records_2024
    FOR INSERT TO authenticated
    WITH CHECK (organization_id = get_my_organization_id());

CREATE POLICY "daily_records_update_policy" ON public.daily_records_2024
    FOR UPDATE TO authenticated
    USING (organization_id = get_my_organization_id());

CREATE POLICY "daily_records_delete_policy" ON public.daily_records_2024
    FOR DELETE TO authenticated
    USING (organization_id = get_my_organization_id());

ALTER TABLE public.daily_records_2024 ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- daily_records_2025
-- =============================================================================
DROP POLICY IF EXISTS "daily_records_select_policy" ON public.daily_records_2025;
DROP POLICY IF EXISTS "daily_records_insert_policy" ON public.daily_records_2025;
DROP POLICY IF EXISTS "daily_records_update_policy" ON public.daily_records_2025;
DROP POLICY IF EXISTS "daily_records_delete_policy" ON public.daily_records_2025;

CREATE POLICY "daily_records_select_policy" ON public.daily_records_2025
    FOR SELECT TO authenticated
    USING (organization_id = get_my_organization_id());

CREATE POLICY "daily_records_insert_policy" ON public.daily_records_2025
    FOR INSERT TO authenticated
    WITH CHECK (organization_id = get_my_organization_id());

CREATE POLICY "daily_records_update_policy" ON public.daily_records_2025
    FOR UPDATE TO authenticated
    USING (organization_id = get_my_organization_id());

CREATE POLICY "daily_records_delete_policy" ON public.daily_records_2025
    FOR DELETE TO authenticated
    USING (organization_id = get_my_organization_id());

ALTER TABLE public.daily_records_2025 ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- daily_records_2026
-- =============================================================================
DROP POLICY IF EXISTS "daily_records_select_policy" ON public.daily_records_2026;
DROP POLICY IF EXISTS "daily_records_insert_policy" ON public.daily_records_2026;
DROP POLICY IF EXISTS "daily_records_update_policy" ON public.daily_records_2026;
DROP POLICY IF EXISTS "daily_records_delete_policy" ON public.daily_records_2026;

CREATE POLICY "daily_records_select_policy" ON public.daily_records_2026
    FOR SELECT TO authenticated
    USING (organization_id = get_my_organization_id());

CREATE POLICY "daily_records_insert_policy" ON public.daily_records_2026
    FOR INSERT TO authenticated
    WITH CHECK (organization_id = get_my_organization_id());

CREATE POLICY "daily_records_update_policy" ON public.daily_records_2026
    FOR UPDATE TO authenticated
    USING (organization_id = get_my_organization_id());

CREATE POLICY "daily_records_delete_policy" ON public.daily_records_2026
    FOR DELETE TO authenticated
    USING (organization_id = get_my_organization_id());

ALTER TABLE public.daily_records_2026 ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- medical_coord_v_records_2024, _2025, _2026（親から動的コピー）
-- =============================================================================
DO $$
DECLARE
    parent_policy RECORD;
    child_tables TEXT[] := ARRAY['medical_coord_v_records_2024', 'medical_coord_v_records_2025', 'medical_coord_v_records_2026'];
    child_table TEXT;
    sql_text TEXT;
    using_clause TEXT;
    check_clause TEXT;
    cmd_text TEXT;
BEGIN
    FOREACH child_table IN ARRAY child_tables LOOP
        -- 親のポリシーを走査
        FOR parent_policy IN 
            SELECT policyname, cmd, roles, qual, with_check 
            FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = 'medical_coord_v_records'
        LOOP
            -- 既存ポリシーを削除
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 
                parent_policy.policyname, child_table);
            
            -- cmdをテキストに変換
            cmd_text := parent_policy.cmd;
            
            -- USING句の構築（テーブル名置換）
            IF parent_policy.qual IS NOT NULL THEN
                using_clause := replace(parent_policy.qual, 'medical_coord_v_records', child_table);
                using_clause := 'USING (' || using_clause || ')';
            ELSE
                using_clause := '';
            END IF;
            
            -- WITH CHECK句の構築（テーブル名置換）
            IF parent_policy.with_check IS NOT NULL THEN
                check_clause := replace(parent_policy.with_check, 'medical_coord_v_records', child_table);
                check_clause := 'WITH CHECK (' || check_clause || ')';
            ELSE
                check_clause := '';
            END IF;
            
            -- CREATE POLICY文の構築
            sql_text := format(
                'CREATE POLICY %I ON public.%I FOR %s TO %s %s %s',
                parent_policy.policyname,
                child_table,
                cmd_text,
                array_to_string(parent_policy.roles, ', '),
                using_clause,
                check_clause
            );
            
            EXECUTE sql_text;
            RAISE NOTICE 'Created policy % on %', parent_policy.policyname, child_table;
        END LOOP;
        
        -- RLS有効化
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', child_table);
        RAISE NOTICE 'Enabled RLS on %', child_table;
    END LOOP;
END $$;

COMMIT;

-- =============================================================================
-- Phase 2 完了確認
-- =============================================================================
SELECT 
    relname as table_name,
    CASE WHEN relrowsecurity THEN '✅ RLS有効' ELSE '❌ RLS無効' END as status
FROM pg_class 
WHERE relname IN (
    'daily_records_2024', 'daily_records_2025', 'daily_records_2026',
    'medical_coord_v_records_2024', 'medical_coord_v_records_2025', 'medical_coord_v_records_2026'
)
ORDER BY relname;

SELECT '===== PHASE 2 完了: 全10テーブルに適用完了 =====' AS status;
SELECT '次のステップ: B_verify_rls.sql で最終検証' AS next_step;
