-- =====================================================
-- Resident Document History Table
-- 利用者の保険証・受給者証の有効期限管理
-- =====================================================

-- 1. テーブル作成
CREATE TABLE IF NOT EXISTS "public"."resident_document_history" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "resident_id" UUID NOT NULL REFERENCES "public"."residents"("id") ON DELETE CASCADE,
    "document_type" TEXT NOT NULL CHECK (document_type IN (
        'main_insurance',      -- 主保険
        'public_expense_1',    -- 公費①
        'public_expense_2',    -- 公費②
        'disability_welfare'   -- 障害福祉サービス受給者証
    )),
    "valid_from" DATE,
    "valid_to" DATE,
    "is_renewal_completed" BOOLEAN DEFAULT false NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. インデックス作成（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS "idx_doc_history_valid_to" ON "public"."resident_document_history"("valid_to");
CREATE INDEX IF NOT EXISTS "idx_doc_history_renewal" ON "public"."resident_document_history"("is_renewal_completed");
CREATE INDEX IF NOT EXISTS "idx_doc_history_resident" ON "public"."resident_document_history"("resident_id");
CREATE INDEX IF NOT EXISTS "idx_doc_history_org" ON "public"."resident_document_history"("organization_id");

-- 3. 権限設定
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."resident_document_history" TO "authenticated";
GRANT ALL ON "public"."resident_document_history" TO "service_role";

-- 4. RLS有効化
ALTER TABLE "public"."resident_document_history" ENABLE ROW LEVEL SECURITY;

-- 5. RLSポリシー（組織ベースのアクセス制御）
CREATE POLICY "doc_history_select_policy" ON "public"."resident_document_history"
    FOR SELECT TO authenticated
    USING (organization_id = get_my_organization_id());

CREATE POLICY "doc_history_insert_policy" ON "public"."resident_document_history"
    FOR INSERT TO authenticated
    WITH CHECK (organization_id = get_my_organization_id());

CREATE POLICY "doc_history_update_policy" ON "public"."resident_document_history"
    FOR UPDATE TO authenticated
    USING (organization_id = get_my_organization_id());

CREATE POLICY "doc_history_delete_policy" ON "public"."resident_document_history"
    FOR DELETE TO authenticated
    USING (organization_id = get_my_organization_id());

-- 6. 更新日時自動更新トリガー
CREATE OR REPLACE FUNCTION update_doc_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "update_doc_history_timestamp"
    BEFORE UPDATE ON "public"."resident_document_history"
    FOR EACH ROW
    EXECUTE FUNCTION update_doc_history_updated_at();
