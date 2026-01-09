# システム構造診断レポート

## 現在の問題
**利用者マスタでは全利用者が表示されるが、業務日誌/医療連携Ⅴでは表示されない**

---

## データフロー分析

### 1. 利用者マスタ (✅ 動作中)
```
[residents/page.tsx]
  ↓ isGlobalAdmin check (admin && facility_id === null)
  ↓ if Admin → .select('*') (全件)
  ↓ if Staff → .eq('facility_id', staff.facility_id)
[Result: Admin sees all residents]
```

### 2. 業務日誌 (❌ 動作しない)
```
[daily-reports/page.tsx]
  ↓ facilityIdFromUrl = searchParams.get('facility_id')
  ↓ facilityId = staff.facility_id || facilityIdFromUrl
  ↓ staff.facility_id = NULL (Admin)
  ↓ facilityIdFromUrl = undefined (URLにパラメータなし)
  ↓ facilityId = NULL
  ↓ "施設を選択してください" message OR 
  ↓ .eq('facility_id', NULL) → 0件
```

---

## 根本原因

### 問題: CSR vs SSR のタイミング

1. **FacilityContext (クライアント側)**
   - ページ読み込み後に施設一覧をフェッチ
   - 最初の施設を選択してURLを更新
   - **しかし、これはクライアント側で実行される**

2. **DailyReportsPage (サーバー側)**
   - サーバー側でレンダリング時に `searchParams` を読む
   - この時点ではまだURLに `?facility_id` がない
   - 結果: `facilityId = null` で0件

### 解決策

**サーバー側でAdminの場合は最初の施設を自動取得する必要がある**

---

## 必要な修正

### 修正1: DailyReportsPage で施設を自動取得

```typescript
// If Admin with no facility_id in URL, fetch first available
if (staff.role === 'admin' && !facilityId) {
    const { data: facilities } = await supabase
        .from('facilities')
        .select('id')
        .eq('organization_id', staff.organization_id)
        .limit(1)
    
    if (facilities && facilities.length > 0) {
        facilityId = facilities[0].id
    }
}
```

### 修正2: 同様の修正を getMedicalVData にも適用

---

## 診断SQL（Supabaseで実行）

以下を実行して、データベースの状態を確認してください：

```sql
-- 1. 現在のRLSポリシー確認
SELECT tablename, policyname, cmd FROM pg_policies 
WHERE tablename IN ('residents', 'facilities', 'staffs', 'daily_records');

-- 2. Adminユーザーの確認
SELECT id, email, role, organization_id, facility_id FROM staffs WHERE role = 'admin';

-- 3. 施設と利用者の紐付け確認
SELECT 
    f.id as facility_id,
    f.name as facility_name,
    f.organization_id,
    COUNT(r.id) as resident_count
FROM facilities f
LEFT JOIN residents r ON r.facility_id = f.id
GROUP BY f.id, f.name, f.organization_id;

-- 4. is_any_admin関数の確認
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'is_any_admin';
```
