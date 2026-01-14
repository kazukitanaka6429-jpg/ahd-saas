-- =============================================================================
-- パーティション子テーブルRLS適用SQL（改訂版）
-- =============================================================================
-- 
-- 【親ポリシーとの完全一致を保証する理由】
-- - daily_records_*: pg_policiesから取得した確定情報をそのまま適用
-- - medical_coord_v_records_*: DOブロックで親pg_policiesを動的に読み取り、
--   1文字単位で同一のポリシーを子に複製（人間のコピペミスを排除）
-- 
-- 【安全順序】
-- 1. DROP POLICY IF EXISTS で既存ポリシーを削除（冪等性）
-- 2. CREATE POLICY で親と同一のポリシーを作成
-- 3. 最後に ENABLE ROW LEVEL SECURITY
-- =============================================================================


-- #############################################################################
-- ===== PHASE 1: _2027 と _default のみ（低リスクから開始） =====
-- #############################################################################

BEGIN;

-- =============================================================================
-- Phase 1-A: daily_records_2027
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
-- Phase 1-A: daily_records_default
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
-- Phase 1-B: medical_coord_v_records_2027（親から動的コピー）
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

-- Phase 1 確認
SELECT 
    relname as table_name,
    CASE WHEN relrowsecurity THEN '✅ RLS有効' ELSE '❌ RLS無効' END as status
FROM pg_class 
WHERE relname IN ('daily_records_2027', 'daily_records_default', 
                  'medical_coord_v_records_2027', 'medical_coord_v_records_default')
ORDER BY relname;

SELECT '===== PHASE 1 完了: _2027 と _default に適用 =====' AS status;
SELECT 'アプリで動作確認後、問題なければ PHASE 2 を実行してください' AS next_step;


-- #############################################################################
-- ===== PHASE 2: _2024, _2025, _2026 （残りのテーブル） =====
-- #############################################################################
-- ※ Phase 1 で問題がないことを確認してから実行してください

BEGIN;

-- =============================================================================
-- Phase 2-A: daily_records_2024
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
-- Phase 2-A: daily_records_2025
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
-- Phase 2-A: daily_records_2026
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
-- Phase 2-B: medical_coord_v_records_2024, _2025, _2026（親から動的コピー）
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

-- Phase 2 確認
SELECT 
    relname as table_name,
    CASE WHEN relrowsecurity THEN '✅ RLS有効' ELSE '❌ RLS無効' END as status
FROM pg_class 
WHERE relname IN ('daily_records_2024', 'daily_records_2025', 'daily_records_2026',
                  'medical_coord_v_records_2024', 'medical_coord_v_records_2025', 'medical_coord_v_records_2026')
ORDER BY relname;

SELECT '===== PHASE 2 完了: 全10テーブルに適用完了 =====' AS status;
