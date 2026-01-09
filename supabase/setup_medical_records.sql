/*
  # 医療連携機能 (Phase 3) データベース構築
  
  医療連携Ⅴ（実績）と医療連携Ⅳ（体制判定）の管理テーブルを構築します。
  
  ## 構成
  1. **medical_coord_v_records (Partitioned)**
     - 訪問看護の実績記録。データ量増大に対応するため `date` パーティショニングを採用。
     - アプリ互換のため、更新可能ビュー `medical_coord_v_records` を提供。
  
  2. **medical_coord_iv_records**
     - スタッフごとの日次体制判定結果（IV-1, IV-2, IV-3）をキャッシュ。
     - 通常のテーブル（パーティショニングなし）。

  ## 依存関係
  - `get_my_organization_id()` 関数
  - `staffs`, `residents` テーブル (FK参照は制約なしで運用)
*/

-- =============================================
-- 1. 医療連携Ⅴ：実績記録 (Partitioned)
-- =============================================

-- クリーンアップ
DROP VIEW IF EXISTS "public"."medical_coord_v_records";
DROP TABLE IF EXISTS "public"."medical_coord_v_records" CASCADE;
DROP TABLE IF EXISTS "public"."medical_coord_v_records_partitioned" CASCADE;

-- パーティション親テーブル
CREATE TABLE "public"."medical_coord_v_records_partitioned" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "organization_id" uuid NOT NULL,
    "facility_id" uuid NOT NULL, -- 施設コンテキストも保持
    "resident_id" uuid NOT NULL,
    "staff_id" uuid NOT NULL,    -- 実施した看護師
    "date" date NOT NULL,
    
    -- 時間記録
    "start_time" time,
    "end_time" time,
    "duration_minutes" integer,
    
    -- 詳細内容 (JSONB)
    "care_contents" jsonb DEFAULT '{}'::jsonb NOT NULL,
    
    -- メタデータ
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    
    PRIMARY KEY ("id", "date")
) PARTITION BY RANGE ("date");

-- パーティション作成 (2024-2027)
CREATE TABLE "public"."medical_coord_v_records_default" PARTITION OF "public"."medical_coord_v_records_partitioned" DEFAULT;

CREATE TABLE "public"."medical_coord_v_records_2024" PARTITION OF "public"."medical_coord_v_records_partitioned"
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE "public"."medical_coord_v_records_2025" PARTITION OF "public"."medical_coord_v_records_partitioned"
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE "public"."medical_coord_v_records_2026" PARTITION OF "public"."medical_coord_v_records_partitioned"
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE "public"."medical_coord_v_records_2027" PARTITION OF "public"."medical_coord_v_records_partitioned"
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

-- インデックス
CREATE INDEX "medical_v_org_idx" ON "public"."medical_coord_v_records_partitioned" ("organization_id");
CREATE INDEX "medical_v_facility_idx" ON "public"."medical_coord_v_records_partitioned" ("facility_id");
CREATE INDEX "medical_v_resident_idx" ON "public"."medical_coord_v_records_partitioned" ("resident_id");
CREATE INDEX "medical_v_staff_idx" ON "public"."medical_coord_v_records_partitioned" ("staff_id");
CREATE INDEX "medical_v_date_idx" ON "public"."medical_coord_v_records_partitioned" ("date");
CREATE INDEX "medical_v_contents_gin_idx" ON "public"."medical_coord_v_records_partitioned" USING GIN ("care_contents");

-- 互換ビュー (Security Invoker)
CREATE OR REPLACE VIEW "public"."medical_coord_v_records" WITH (security_invoker = true) AS
    SELECT * FROM "public"."medical_coord_v_records_partitioned";

-- 権限
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."medical_coord_v_records" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."medical_coord_v_records_partitioned" TO "authenticated";
GRANT ALL ON "public"."medical_coord_v_records" TO "service_role";
GRANT ALL ON "public"."medical_coord_v_records_partitioned" TO "service_role";

-- RLS (Partitioned Table)
ALTER TABLE "public"."medical_coord_v_records_partitioned" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medical_v_select_policy" ON "public"."medical_coord_v_records_partitioned"
    FOR SELECT TO authenticated USING (organization_id = get_my_organization_id());

CREATE POLICY "medical_v_insert_policy" ON "public"."medical_coord_v_records_partitioned"
    FOR INSERT TO authenticated WITH CHECK (organization_id = get_my_organization_id());

CREATE POLICY "medical_v_update_policy" ON "public"."medical_coord_v_records_partitioned"
    FOR UPDATE TO authenticated USING (organization_id = get_my_organization_id());

CREATE POLICY "medical_v_delete_policy" ON "public"."medical_coord_v_records_partitioned"
    FOR DELETE TO authenticated USING (organization_id = get_my_organization_id());

-- Updated_at Trigger
CREATE TRIGGER "update_medical_v_timestamp"
    BEFORE UPDATE ON "public"."medical_coord_v_records_partitioned"
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_records_updated_at(); -- Reuse existing function


-- =============================================
-- 2. 医療連携Ⅳ：体制判定 (Cache Table)
-- =============================================

DROP TABLE IF EXISTS "public"."medical_coord_iv_records" CASCADE;

CREATE TABLE "public"."medical_coord_iv_records" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, -- シンプルなPK
    "organization_id" uuid NOT NULL,
    "facility_id" uuid NOT NULL, -- 集計コンテキスト
    "staff_id" uuid NOT NULL,
    "date" date NOT NULL,
    
    -- 判定結果
    "assigned_resident_count" integer DEFAULT 0 NOT NULL,
    "classification" text, -- 'iv_1', 'iv_2', 'iv_3' など
    
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    
    -- ユニーク制約 (同日・同スタッフの判定は1つ)
    CONSTRAINT "medical_iv_staff_date_unique" UNIQUE ("staff_id", "date")
);

-- インデックス
CREATE INDEX "medical_iv_org_idx" ON "public"."medical_coord_iv_records" ("organization_id");
CREATE INDEX "medical_iv_staff_date_idx" ON "public"."medical_coord_iv_records" ("staff_id", "date");

-- 権限
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."medical_coord_iv_records" TO "authenticated";
GRANT ALL ON "public"."medical_coord_iv_records" TO "service_role";

-- RLS
ALTER TABLE "public"."medical_coord_iv_records" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medical_iv_select_policy" ON "public"."medical_coord_iv_records"
    FOR SELECT TO authenticated USING (organization_id = get_my_organization_id());

CREATE POLICY "medical_iv_insert_policy" ON "public"."medical_coord_iv_records"
    FOR INSERT TO authenticated WITH CHECK (organization_id = get_my_organization_id());

CREATE POLICY "medical_iv_update_policy" ON "public"."medical_coord_iv_records"
    FOR UPDATE TO authenticated USING (organization_id = get_my_organization_id());

CREATE POLICY "medical_iv_delete_policy" ON "public"."medical_coord_iv_records"
    FOR DELETE TO authenticated USING (organization_id = get_my_organization_id());

-- Updated_at Trigger
CREATE TRIGGER "update_medical_iv_timestamp"
    BEFORE UPDATE ON "public"."medical_coord_iv_records"
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_records_updated_at();
