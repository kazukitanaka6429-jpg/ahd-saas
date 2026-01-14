-- =============================================================================
-- A1_phase1_apply_rls.sql
-- パーティション子テーブルRLS適用 - Phase 1（_2027 と _default のみ）
-- =============================================================================
-- 
-- 【Phase 1 対象】
-- - daily_records_2027, daily_records_default
-- - medical_coord_v_records_2027, medical_coord_v_records_default
-- 
-- 【Phase 1 完了後の手順】
-- 1. B_verify_rls.sql で確認
-- 2. アプリで動作確認（業務日誌、医療連携V）
-- 3. 問題なければ A2_phase2_apply_rls.sql を実行
-- 
-- 【親ポリシーとの完全一致を保証する理由】
-- - daily_records_*: pg_policiesから取得した確定情報をそのまま適用
-- - medical_coord_v_records_*: DOブロックで親pg_policiesを動的に読み取り、
--   1文字単位で同一のポリシーを子に複製（人間のコピペミスを排除）
-- =============================================================================

BEGIN;

-- =============================================================================
-- daily_records_2027
-- =============================================================================
DROP POLICY IF EXISTS "daily_records_select_policy" ON public.daily_records_2027;
DROP POLICY IF EXISTS "daily_records_insert_policy" ON public.daily_records_2027;
DROP POLICY IF EXISTS "daily_records_update_policy" ON public.daily_records_2027;
DROP POLICY IF EXISTS "daily_records_delete_policy" ON public.daily_records_2027;

CREATE POLICY "daily_records_select_policy" ON public.daily_records_2027
    FOR SELECT TO authenticated
    USING (organization_id = get_my_organization_id());

CREATE POLICY "daily_records_insert_policy" ON public.daily_records_2027
    FOR INSERT TO authenticated
    WITH CHECK (organization_id = get_my_organization_id());

CREATE POLICY "daily_records_update_policy" ON public.daily_records_2027
    FOR UPDATE TO authenticated
    USING (organization_id = get_my_organization_id());

CREATE POLICY "daily_records_delete_policy" ON public.daily_records_2027
    FOR DELETE TO authenticated
    USING (organization_id = get_my_organization_id());

ALTER TABLE public.daily_records_2027 ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- daily_records_default
-- =============================================================================
DROP POLICY IF EXISTS "daily_records_select_policy" ON public.daily_records_default;
DROP POLICY IF EXISTS "daily_records_insert_policy" ON public.daily_records_default;
DROP POLICY IF EXISTS "daily_records_update_policy" ON public.daily_records_default;
DROP POLICY IF EXISTS "daily_records_delete_policy" ON public.daily_records_default;

CREATE POLICY "daily_records_select_policy" ON public.daily_records_default
    FOR SELECT TO authenticated
    USING (organization_id = get_my_organization_id());

CREATE POLICY "daily_records_insert_policy" ON public.daily_records_default
    FOR INSERT TO authenticated
    WITH CHECK (organization_id = get_my_organization_id());

CREATE POLICY "daily_records_update_policy" ON public.daily_records_default
    FOR UPDATE TO authenticated
    USING (organization_id = get_my_organization_id());

CREATE POLICY "daily_records_delete_policy" ON public.daily_records_default
    FOR DELETE TO authenticated
    USING (organization_id = get_my_organization_id());

ALTER TABLE public.daily_records_default ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- medical_coord_v_records_2027, _default（親から動的コピー）
-- =============================================================================
DO $$
DECLARE
    parent_policy RECORD;
    child_tables TEXT[] := ARRAY['medical_coord_v_records_2027', 'medical_coord_v_records_default'];
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
-- Phase 1 完了確認
-- =============================================================================
SELECT 
    relname as table_name,
    CASE WHEN relrowsecurity THEN '✅ RLS有効' ELSE '❌ RLS無効' END as status
FROM pg_class 
WHERE relname IN ('daily_records_2027', 'daily_records_default', 
                  'medical_coord_v_records_2027', 'medical_coord_v_records_default')
ORDER BY relname;

SELECT '===== PHASE 1 完了: _2027 と _default に適用 =====' AS status;
SELECT '次のステップ: B_verify_rls.sql で検証 → アプリ確認 → A2_phase2_apply_rls.sql' AS next_step;
