-- =============================================================================
-- ロールバックSQL - RLS適用を元に戻す（緊急復旧用）
-- =============================================================================
-- 
-- 【使用タイミング】
-- - RLS適用後にアプリが動作しなくなった場合
-- - 予期せぬアクセス拒否が発生した場合
-- 
-- 【注意】
-- - このSQLを実行すると、子テーブルのRLSが無効になり、
--   Security Advisorの警告が再表示される
-- - 緊急復旧を最優先し、原因調査は後で行う
-- =============================================================================

BEGIN;

-- =============================================================================
-- 緊急復旧: 全10テーブルのRLS無効化
-- =============================================================================

-- daily_records パーティション（5テーブル）
ALTER TABLE public.daily_records_2024 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records_2025 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records_2026 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records_2027 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records_default DISABLE ROW LEVEL SECURITY;

-- medical_coord_v_records パーティション（5テーブル）
ALTER TABLE public.medical_coord_v_records_2024 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_coord_v_records_2025 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_coord_v_records_2026 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_coord_v_records_2027 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_coord_v_records_default DISABLE ROW LEVEL SECURITY;

COMMIT;

SELECT '⚠️ RLS無効化完了: 10テーブルのRLSを無効化しました' AS status;


-- =============================================================================
-- 確認: RLS状態
-- =============================================================================
SELECT 
    relname as table_name,
    relrowsecurity as rls_enabled,
    CASE WHEN NOT relrowsecurity THEN '✅ 無効化済み' ELSE '❌ まだ有効' END as status
FROM pg_class 
WHERE relname IN (
    'daily_records_2024',
    'daily_records_2025',
    'daily_records_2026',
    'daily_records_2027',
    'daily_records_default',
    'medical_coord_v_records_2024',
    'medical_coord_v_records_2025',
    'medical_coord_v_records_2026',
    'medical_coord_v_records_2027',
    'medical_coord_v_records_default'
)
ORDER BY relname;


-- =============================================================================
-- オプション: ポリシー削除（完全クリーンアップ）
-- =============================================================================
-- 通常はRLS無効化だけで十分。ポリシーは残っていても害がない。
-- 完全に元に戻したい場合のみ以下を実行。

/*
BEGIN;

-- daily_records パーティション
DROP POLICY IF EXISTS "daily_records_select_policy" ON public.daily_records_2024;
DROP POLICY IF EXISTS "daily_records_insert_policy" ON public.daily_records_2024;
DROP POLICY IF EXISTS "daily_records_update_policy" ON public.daily_records_2024;
DROP POLICY IF EXISTS "daily_records_delete_policy" ON public.daily_records_2024;

DROP POLICY IF EXISTS "daily_records_select_policy" ON public.daily_records_2025;
DROP POLICY IF EXISTS "daily_records_insert_policy" ON public.daily_records_2025;
DROP POLICY IF EXISTS "daily_records_update_policy" ON public.daily_records_2025;
DROP POLICY IF EXISTS "daily_records_delete_policy" ON public.daily_records_2025;

DROP POLICY IF EXISTS "daily_records_select_policy" ON public.daily_records_2026;
DROP POLICY IF EXISTS "daily_records_insert_policy" ON public.daily_records_2026;
DROP POLICY IF EXISTS "daily_records_update_policy" ON public.daily_records_2026;
DROP POLICY IF EXISTS "daily_records_delete_policy" ON public.daily_records_2026;

DROP POLICY IF EXISTS "daily_records_select_policy" ON public.daily_records_2027;
DROP POLICY IF EXISTS "daily_records_insert_policy" ON public.daily_records_2027;
DROP POLICY IF EXISTS "daily_records_update_policy" ON public.daily_records_2027;
DROP POLICY IF EXISTS "daily_records_delete_policy" ON public.daily_records_2027;

DROP POLICY IF EXISTS "daily_records_select_policy" ON public.daily_records_default;
DROP POLICY IF EXISTS "daily_records_insert_policy" ON public.daily_records_default;
DROP POLICY IF EXISTS "daily_records_update_policy" ON public.daily_records_default;
DROP POLICY IF EXISTS "daily_records_delete_policy" ON public.daily_records_default;

-- medical_coord_v_records パーティション
-- 動的に作成したポリシー名を削除
DROP POLICY IF EXISTS "Enable all for authenticated users based on facility_id" ON public.medical_coord_v_records_2024;
DROP POLICY IF EXISTS "Enable all for authorized staff flat" ON public.medical_coord_v_records_2024;

DROP POLICY IF EXISTS "Enable all for authenticated users based on facility_id" ON public.medical_coord_v_records_2025;
DROP POLICY IF EXISTS "Enable all for authorized staff flat" ON public.medical_coord_v_records_2025;

DROP POLICY IF EXISTS "Enable all for authenticated users based on facility_id" ON public.medical_coord_v_records_2026;
DROP POLICY IF EXISTS "Enable all for authorized staff flat" ON public.medical_coord_v_records_2026;

DROP POLICY IF EXISTS "Enable all for authenticated users based on facility_id" ON public.medical_coord_v_records_2027;
DROP POLICY IF EXISTS "Enable all for authorized staff flat" ON public.medical_coord_v_records_2027;

DROP POLICY IF EXISTS "Enable all for authenticated users based on facility_id" ON public.medical_coord_v_records_default;
DROP POLICY IF EXISTS "Enable all for authorized staff flat" ON public.medical_coord_v_records_default;

COMMIT;

SELECT 'ポリシー削除完了' AS status;
*/
