# システム整合性監査結果

## 発見された問題

### 問題1: 施設保存エラー (Column Mismatch)
**症状:** 施設マスタで保存時にエラー

**原因:** `app/actions/admin/facilities.ts` で `office_number` というカラムを参照しているが：
- TypeScript型 (`types/index.ts`) では `provider_number`
- UI (`facility-form.tsx`) でも `provider_number`
- データベーススキーマには **そもそもこのカラムが存在しない**

**修正:** `upsertFacility` アクションの `office_number` → `provider_number` に変更。また、DBに `provider_number` カラムを追加する必要あり。

---

### 問題2: 利用者が業務日誌に表示されない
**症状:** 利用者マスタに登録があるのに、業務日誌で選択肢に出てこない

**原因候補:**
1. `residents` テーブルにRLSポリシーが設定されておらず、`ENABLE ROW LEVEL SECURITY` 状態で全拒否になっている
2. または、RLS有効でもポリシー要件（例: `can_access_facility(facility_id)`）を満たさないため0件になる

**確認SQL:**
```sql
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'residents';
SELECT * FROM pg_policies WHERE tablename = 'residents';
```

---

### 問題3: Admin用のfacilities SELECT RLS
**現状ポリシー:** `Users can read assigned facility` → `can_access_facility(id)`

この関数は `staffs` テーブルを参照するため、入れ子RLS問題を引き起こす可能性あり。

---

## アクションプラン

1. **施設アクションのカラム名修正** (即時)
2. **DB: `provider_number` カラム追加** (SQL実行)
3. **residents テーブルのRLS状況確認と修正** (SQL実行)
4. **facilities SELECT RLSをシンプルに修正** (is_any_admin() 使用)

---

## 次のステップ
上記の内容を確認後、修正に着手します。
