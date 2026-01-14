-- =============================================================================
-- B_verify_rls.sql - 検証SQL（完全一致チェック付き）
-- =============================================================================

-- =============================================================================
-- 1. RLS状態確認 - 10テーブルすべてでrls_enabled=trueであること
-- =============================================================================
SELECT 
    relname as table_name,
    relrowsecurity as rls_enabled,
    CASE WHEN relrowsecurity THEN '✅' ELSE '❌' END as status
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

-- 期待結果: 10行すべてで rls_enabled = true, status = ✅


-- =============================================================================
-- 2. ポリシー数確認 - 期待本数があること
-- =============================================================================
SELECT 
    tablename,
    COUNT(*) as policy_count,
    CASE 
        WHEN tablename LIKE 'daily_records_%' AND COUNT(*) = 4 THEN '✅ 4本'
        WHEN tablename LIKE 'medical_coord_v_records_%' AND COUNT(*) = 2 THEN '✅ 2本'
        ELSE '❌ 本数不一致'
    END as status
FROM pg_policies 
WHERE tablename IN (
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
GROUP BY tablename
ORDER BY tablename;

-- 期待結果: daily_records_* 各4本, medical_coord_v_records_* 各2本


-- =============================================================================
-- 3. daily_records 親子ポリシー完全一致確認（qual/with_check含む）
-- =============================================================================
WITH parent AS (
    SELECT 
        policyname,
        cmd,
        roles::text AS roles,
        COALESCE(qual, '') AS qual,
        COALESCE(with_check, '') AS with_check
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'daily_records_partitioned'
),
child AS (
    SELECT 
        tablename,
        policyname,
        cmd,
        roles::text AS roles,
        COALESCE(qual, '') AS qual,
        COALESCE(with_check, '') AS with_check
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN ('daily_records_2024', 'daily_records_2025', 
                        'daily_records_2026', 'daily_records_2027', 'daily_records_default')
)
SELECT 
    c.tablename,
    c.policyname,
    CASE 
        WHEN p.policyname IS NULL THEN '❌ 親にない'
        WHEN c.cmd != p.cmd THEN '❌ cmd不一致'
        WHEN c.roles != p.roles THEN '❌ roles不一致'
        WHEN c.qual != p.qual THEN '❌ qual不一致'
        WHEN c.with_check != p.with_check THEN '❌ with_check不一致'
        ELSE '✅ 完全一致'
    END as match_status
FROM child c
LEFT JOIN parent p USING (policyname)
ORDER BY c.tablename, c.policyname;

-- 期待結果: 全て「✅ 完全一致」


-- =============================================================================
-- 4. medical_coord_v_records 親子ポリシー完全一致確認（qual/with_check含む）
-- =============================================================================
-- ※子側のqual/with_checkには子テーブル名が含まれるため、
--   親テーブル名に正規化してから比較
WITH parent AS (
    SELECT
        policyname,
        cmd,
        roles::text AS roles,
        COALESCE(qual, '') AS qual,
        COALESCE(with_check, '') AS with_check
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'medical_coord_v_records'
),
child AS (
    SELECT
        tablename,
        policyname,
        cmd,
        roles::text AS roles,
        COALESCE(qual, '') AS qual,
        COALESCE(with_check, '') AS with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
          'medical_coord_v_records_2024', 'medical_coord_v_records_2025', 'medical_coord_v_records_2026',
          'medical_coord_v_records_2027', 'medical_coord_v_records_default'
      )
),
normalized AS (
    SELECT
        tablename,
        policyname,
        cmd,
        roles,
        replace(qual, tablename, 'medical_coord_v_records') AS qual_norm,
        replace(with_check, tablename, 'medical_coord_v_records') AS with_check_norm
    FROM child
)
SELECT
    n.tablename,
    n.policyname,
    CASE
        WHEN p.policyname IS NULL THEN '❌ 親にない'
        WHEN n.cmd != p.cmd THEN '❌ cmd不一致'
        WHEN n.roles != p.roles THEN '❌ roles不一致'
        WHEN n.qual_norm != p.qual THEN '❌ qual不一致'
        WHEN n.with_check_norm != p.with_check THEN '❌ with_check不一致'
        ELSE '✅ 完全一致'
    END AS match_status
FROM normalized n
LEFT JOIN parent p USING (policyname)
ORDER BY n.tablename, n.policyname;

-- 期待結果: 全て「✅ 完全一致」


-- =============================================================================
-- 5. ポリシー詳細一覧（必要に応じて確認）
-- =============================================================================
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename IN (
    'daily_records_partitioned',
    'daily_records_2024',
    'daily_records_2025',
    'daily_records_2026',
    'daily_records_2027',
    'daily_records_default',
    'medical_coord_v_records',
    'medical_coord_v_records_2024',
    'medical_coord_v_records_2025',
    'medical_coord_v_records_2026',
    'medical_coord_v_records_2027',
    'medical_coord_v_records_default'
)
ORDER BY tablename, policyname;


-- =============================================================================
-- 6. Security Advisor 警告確認
-- =============================================================================
-- Supabase Dashboard > Database > Security Advisor で確認
-- 以下10テーブルの "RLS Disabled in Public" 警告が消えていること:
-- - daily_records_2024, _2025, _2026, _2027, _default
-- - medical_coord_v_records_2024, _2025, _2026, _2027, _default


-- =============================================================================
-- 7. アプリ動作スモークテスト チェックリスト
-- =============================================================================
-- 
-- □ 業務日誌 (/daily-reports)
--   □ 日誌一覧が表示される
--   □ 新規レコード作成できる
--   □ 既存レコード編集できる
--   □ バイタル等の入力が保存される
--
-- □ 医療連携V (/medical-v)
--   □ 画面が表示される
--   □ チェックボックスのON/OFFが保存される
--   □ 指導看護師数が保存される
--
-- □ 本社日次確認 (/hq/daily) ※ admin権限で
--   □ 全施設のデータが表示される
--   □ 編集モードで修正できる
--
-- □ ログイン/ログアウト
--   □ 通常通り動作する


-- =============================================================================
-- 8. 子テーブル直接アクセステスト（RLSが効いているか確認）
-- =============================================================================
-- 認証済みセッション（authenticated user）で以下を実行し、
-- 自組織のデータのみ返ることを確認
--
-- ※ daily_records_* は organization_id でアクセス制御
-- ※ medical_coord_v_records_* は facility_id + staffs参照でアクセス制御

-- 例: daily_records_2026 直接クエリ（自組織のみ取得）
-- SELECT count(*) FROM public.daily_records_2026;
-- → 自組織 (organization_id = get_my_organization_id()) のレコードのみカウント

-- 例: 他組織のデータ取得試行
-- SELECT * FROM public.daily_records_2026 
-- WHERE organization_id != get_my_organization_id() LIMIT 5;
-- → 0件返る（RLSで弾かれる）


-- =============================================================================
-- 完了
-- =============================================================================
SELECT '検証SQL実行完了' AS status;
