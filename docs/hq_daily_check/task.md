# 仕様監査タスク (Audit against REQUIREMENTS.md)

## 監査対象
- [x] **1. 医療連携予実ロジック**
  - 同日担当看護師の利用者数カウントロジック (IV 1/2/3) -> ✅ 実装完了 (IV 1/2/3動的判定追加)
  - `qualifications.is_medical_target` の考慮 -> ✅ 実装完了
- [x] **2. 業務日誌バリデーション**
  - 夜勤職員数 < 4 で加配NG -> ✅ 実装済み
  - 日中活動内容の必須チェック -> ✅ 実装済み
  - 夜間状況の必須チェック -> ✅ 実装済み
- [x] **3. Admin権限設計**
  - 施設マスタ非依存 (facility_id is null) -> ✅ 実装済み
  - 全データアクセス権限 -> ✅ 実装済み

## 確認済みファイル
- `app/actions/medical-v/get-medical-v-data.ts`
- `lib/daily-report-validation.ts`
- `lib/auth-helpers.ts`
- `app/actions/hq/get-hq-daily-data.ts`
- `app/actions/medical-v/upsert-medical-v.ts`
- `app/(dashboard)/medical-cooperation/actions.ts`
