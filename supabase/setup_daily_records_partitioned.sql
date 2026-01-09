/*
  # 100万法人対応 業務日誌テーブルセットアップ (Partitioned)
  
  このSQLは、`daily_records` テーブルをパーティショニング構成（`daily_records_partitioned`）に置換し、
  将来的な大規模運用（100万法人、数億レコード）に耐えうる設計を提供します。

  ## 特徴
  1. **パーティショニング**: `date` カラムによるレンジパーティショニングを採用。
     - 過去データのアーカイブや削除が高速。
     - 特定期間のクエリパフォーマンス向上。
  2. **セキュリティ**: `SECURITY DEFINER` 関数による厳格なテナント分離と、`security_invoker` ビューによるRLSの正しい適用。
  3. **互換性**: 更新可能なビュー `daily_records` を提供することで、アプリケーションコードの変更を最小限に抑えます。
  4. **拡張性**: `data` (JSONB) カラムにより、スキーマ変更なしで項目追加が可能。
  5. **夕勤対応**: `evening_staff_ids` (JSONB配列) を追加。

  ## 実行時の注意
  - 既存の `daily_records` テーブルはこのスクリプトにより削除されます (CASCADE)。
  - `get_my_organization_id()` 関数（マスタ構築で作成済み）が必要です。
*/

-- 1. 既存オブジェクトのクリーンアップ (CASCADEで依存関係も削除)
DROP VIEW IF EXISTS "public"."daily_records";
DROP TABLE IF EXISTS "public"."daily_records" CASCADE;
DROP TABLE IF EXISTS "public"."daily_records_partitioned" CASCADE;

-- 2. パーティションテーブル（親）の作成
CREATE TABLE "public"."daily_records_partitioned" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "organization_id" uuid NOT NULL,
    "facility_id" uuid NOT NULL,
    "resident_id" uuid NOT NULL,
    "date" date NOT NULL,
    
    -- データ格納用 JSONB (フロントエンドの入力項目を柔軟に格納)
    "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
    
    -- 夕勤担当者 (JSONB配列: ["uuid1", "uuid2"])
    "evening_staff_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
    
    -- メタデータ
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    
    -- パーティショニングの制約上、パーティションキー(date)をPKに含める必須がある
    PRIMARY KEY ("id", "date"),

    -- UPSERT (ON CONFLICT) 用のユニーク制約
    -- これがないと resident_id, date での重複チェックができず upsert が機能しません
    CONSTRAINT "daily_records_resident_date_key" UNIQUE ("resident_id", "date")
) PARTITION BY RANGE ("date");

-- 3. パーティション（子テーブル）の作成
-- デフォルト（範囲外用）
CREATE TABLE "public"."daily_records_default" PARTITION OF "public"."daily_records_partitioned" DEFAULT;

-- 年次パーティション (2024 - 2027)
CREATE TABLE "public"."daily_records_2024" PARTITION OF "public"."daily_records_partitioned"
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE "public"."daily_records_2025" PARTITION OF "public"."daily_records_partitioned"
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE "public"."daily_records_2026" PARTITION OF "public"."daily_records_partitioned"
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE "public"."daily_records_2027" PARTITION OF "public"."daily_records_partitioned"
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

-- 4. インデックスの作成
-- 外部キー制約はパフォーマンスへの影響があるため設定せず、インデックスのみ作成して高速化
CREATE INDEX "daily_records_org_idx" ON "public"."daily_records_partitioned" ("organization_id");
CREATE INDEX "daily_records_facility_idx" ON "public"."daily_records_partitioned" ("facility_id");
CREATE INDEX "daily_records_resident_idx" ON "public"."daily_records_partitioned" ("resident_id");
CREATE INDEX "daily_records_date_idx" ON "public"."daily_records_partitioned" ("date");

-- JSONBインデックス (GIN) - クエリ高速化用
CREATE INDEX "daily_records_data_gin_idx" ON "public"."daily_records_partitioned" USING GIN ("data");
CREATE INDEX "daily_records_evening_staff_idx" ON "public"."daily_records_partitioned" USING GIN ("evening_staff_ids");

-- 5. アプリケーション互換用ビューの作成
-- アプリが `id` のみでアクセスしようとした場合でも、Postgresがパーティションをスキャンして処理可能にします。
-- 重要: `security_invoker = true` により、ビューへのクエリ実行ユーザー(authenticated)の権限でRLSチェックが行われます。
-- これがないと、ビューの所有者(postgres)権限で実行され、RLSがバイパスされる危険があります。

CREATE OR REPLACE VIEW "public"."daily_records" WITH (security_invoker = true) AS
    SELECT * FROM "public"."daily_records_partitioned";

-- 6. 権限設定 (Grant)
-- ビューとテーブル両方に権限を与える必要があります（security_invokerのため）
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."daily_records" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."daily_records_partitioned" TO "authenticated";

GRANT ALL ON "public"."daily_records" TO "service_role";
GRANT ALL ON "public"."daily_records_partitioned" TO "service_role";

-- 7. RLSの有効化
ALTER TABLE "public"."daily_records_partitioned" ENABLE ROW LEVEL SECURITY;

-- 8. RLSポリシーの定義
-- マスタ構築済みの `get_my_organization_id()` 関数を使用し、組織IDによる厳格なフィルタリング

-- SELECT
CREATE POLICY "daily_records_select_policy" ON "public"."daily_records_partitioned"
    FOR SELECT TO authenticated
    USING (organization_id = get_my_organization_id());

-- INSERT
CREATE POLICY "daily_records_insert_policy" ON "public"."daily_records_partitioned"
    FOR INSERT TO authenticated
    WITH CHECK (organization_id = get_my_organization_id());

-- UPDATE
CREATE POLICY "daily_records_update_policy" ON "public"."daily_records_partitioned"
    FOR UPDATE TO authenticated
    USING (organization_id = get_my_organization_id());

-- DELETE
CREATE POLICY "daily_records_delete_policy" ON "public"."daily_records_partitioned"
    FOR DELETE TO authenticated
    USING (organization_id = get_my_organization_id());

-- 9. 更新日時自動更新トリガー
CREATE OR REPLACE FUNCTION update_daily_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "update_daily_records_timestamp"
    BEFORE UPDATE ON "public"."daily_records_partitioned"
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_records_updated_at();
