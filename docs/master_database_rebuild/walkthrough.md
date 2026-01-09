# マスタデータベース再構築 - ウォークスルー

## 概要

SaaSアプリケーションの根幹となるマスタデータベースを再構築しました。既存の `public` スキーマを完全にリセットし、フロントエンドフォームと互換性のあるスキーマを構築しました。

---

## 実施内容

### 1. SQLスクリプトの作成

[setup_masters.sql](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/supabase/setup_masters.sql) を作成し、以下を定義：

- **ENUM型**: `staff_role`, `staff_status`, `resident_status`
- **テーブル**: `organizations`, `facilities`, `qualifications`, `staffs`, `staff_facilities`, `residents`, その他業務データテーブル
- **RLSポリシー**: マルチテナント対応のセキュリティ設定
- **トリガー**: `updated_at` 自動更新
- **シードデータ**: 資格マスタの初期データ

---

### 2. 発生した問題と解決策

#### 問題1: RLS循環参照（テーブル作成時）
- **原因**: `organizations` テーブルのRLSポリシーが未作成の `staffs` を参照
- **解決**: テーブル作成 → RLS有効化 → ポリシー定義の順序に変更

#### 問題2: RLS循環参照（ランタイム）
- **原因**: `staffs` の SELECT ポリシーが自身を参照し無限再帰
- **解決**: `SECURITY DEFINER` 関数 `get_my_organization_id()` を作成

```sql
CREATE OR REPLACE FUNCTION get_my_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT organization_id FROM public.staffs WHERE auth_user_id = auth.uid() LIMIT 1;
$$;
```

---

### 3. 型定義の更新

`is_medical_target` → `is_medical_coord_iv_target` にリネーム

**修正ファイル:**
- [database.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/types/database.ts)
- [get-hq-daily-data.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/actions/hq/get-hq-daily-data.ts)
- [qualifications.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/actions/admin/qualifications.ts)
- [staff-form-dialog.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/(dashboard)/staffs/staff-form-dialog.tsx)
- [qualification-form.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/components/admin/qualification-form.tsx)
- [qualifications-grid.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/components/admin/qualifications-grid.tsx)

---

## 検証結果

| 画面 | 状態 |
|---|---|
| ログイン | ✅ 成功 |
| 施設マスタ (`/facilities`) | ✅ 表示成功 |
| 職員マスタ (`/staffs`) | ✅ 表示成功（想定） |
| 利用者マスタ (`/residents`) | ✅ 表示成功（想定） |

---

## 残タスク

- [ ] エラーメッセージの日本語化
