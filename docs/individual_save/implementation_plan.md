# 業務日誌の個別保存機能

## 概要
現在の業務日誌保存処理は、全員分をまとめてバリデーション・保存しているため、一人でも入力不備があると全員分の保存がブロックされます。この問題を解決し、個別にバリデーション・保存を行う機能を実装します。

### 要件
1. **個別保存**: 一人ずつバリデーションし、エラーのない人だけ保存を実行
2. **日中活動エラー**: GH・日中活動・その他福祉サービスの全てが未入力の場合、3項目すべてにエラー表示
3. **夜間エラー**: 夜間状況が未入力の場合、GH泊だけでなく4項目（GH泊、救急搬送、入院、外泊）すべてにエラー表示

---

## 変更内容

### 1. バリデーションロジック

#### [MODIFY] [daily-report-validation.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/lib/daily-report-validation.ts)

**A2a: 日中活動エラー** - 既に`is_gh`と`daytime_activity`の両方にエラーを追加している。`other_welfare_service`にも追加する必要あり。

```diff
 // A2a: Day Activity Required
 if (!data.is_gh && !hasDaytimeActivity) {
     errors.push({
         id: `A2a-daytime-${residentId}`,
         residentId,
         residentName,
         field: 'daytime_activity',
         message: 'GH または 日中活動 のいずれかは必須です。'
     })
     errors.push({
         id: `A2a-gh-${residentId}`,
         residentId,
         residentName,
         field: 'is_gh',
         message: 'GH または 日中活動 のいずれかは必須です。'
     })
+    errors.push({
+        id: `A2a-welfare-${residentId}`,
+        residentId,
+        residentName,
+        field: 'other_welfare_service',
+        message: 'GH または 日中活動 のいずれかは必須です。'
+    })
 }
```

**A3: 夜間エラー** - 現在は`is_gh_night`のみにエラーを追加。4項目すべてに追加する。

```diff
 // A3: Night Status Required
 if (!hasNightStatus) {
     errors.push({
         id: `A3-night-${residentId}`,
         residentId,
         residentName,
         field: 'is_gh_night',
         message: '夜間の状況（GH泊など）は必須項目です。'
     })
+    errors.push({
+        id: `A3-emergency-${residentId}`,
+        residentId,
+        residentName,
+        field: 'emergency_transport',
+        message: '夜間の状況（GH泊など）は必須項目です。'
+    })
+    errors.push({
+        id: `A3-hospital-${residentId}`,
+        residentId,
+        residentName,
+        field: 'hospitalization_status',
+        message: '夜間の状況（GH泊など）は必須項目です。'
+    })
+    errors.push({
+        id: `A3-overnight-${residentId}`,
+        residentId,
+        residentName,
+        field: 'overnight_stay_status',
+        message: '夜間の状況（GH泊など）は必須項目です。'
+    })
 }
```

---

### 2. 保存ロジック改修

#### [MODIFY] [global-save-context.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/components/providers/global-save-context.tsx)

**個別保存対応**: 保存結果を詳細に返すため、インターフェースを拡張。

```diff
 interface GlobalSaveContextType {
     // ... existing fields
-    triggerGlobalSave: (skipWarnings?: boolean) => Promise<{ success: boolean; warnings?: any[] }>
+    triggerGlobalSave: (skipWarnings?: boolean) => Promise<{ 
+        success: boolean
+        warnings?: any[]
+        savedCount?: number
+        failedCount?: number
+        failedResidents?: string[]
+    }>
 }
```

---

#### [MODIFY] [daily-report-grid.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/components/features/daily-report/daily-report-grid.tsx)

**個別バリデーション・保存**: 保存処理を改修し、エラーのない人だけを保存する。

主な変更点:
1. `registerSaveNode` に渡す関数内で、個別にバリデーションを実行
2. エラーのない人のレコードだけを `upsertDailyRecordsBulk` に渡す
3. 保存結果をトーストで表示（X人保存成功、Y人エラーなど）

```typescript
// 保存関数内で個別バリデーション
registerSaveNode(id, async () => {
    if (pendingChanges.size === 0) return { savedCount: 0, failedCount: 0 }

    const nightStaffCount = getSharedState<number>('nightStaffCount') || 0
    const nightShiftPlus = getSharedState<boolean>('nightShiftPlus') || false

    // 個別バリデーションして保存可能なレコードを抽出
    const recordsToSave: any[] = []
    const failedResidents: string[] = []

    pendingChanges.forEach((changes, residentId) => {
        const resident = residents.find(r => r.id === residentId)
        const record = localData.get(residentId)
        const data = record?.data || {}

        // 個別バリデーション
        const residentRecord = {
            residentId,
            residentName: resident?.name || '',
            data: {
                is_gh: (data as any)?.is_gh ?? record?.is_gh ?? false,
                is_gh_night: (data as any)?.is_gh_night ?? record?.is_gh_night ?? false,
                daytime_activity: (data as any)?.daytime_activity ?? record?.daytime_activity ?? false,
                other_welfare_service: (data as any)?.other_welfare_service ?? record?.other_welfare_service ?? null,
                meal_lunch: (data as any)?.meal_lunch ?? record?.meal_lunch ?? false,
                emergency_transport: (data as any)?.emergency_transport ?? record?.emergency_transport ?? false,
                hospitalization_status: (data as any)?.hospitalization_status ?? record?.hospitalization_status ?? false,
                overnight_stay_status: (data as any)?.overnight_stay_status ?? record?.overnight_stay_status ?? false,
            }
        }

        const result = validateDailyReport([residentRecord], nightStaffCount, nightShiftPlus)
        // 施設レベルエラーは無視（個人エラーのみチェック）
        const personalErrors = result.errors.filter(e => e.residentId === residentId)
        
        if (personalErrors.length === 0) {
            recordsToSave.push({
                resident_id: residentId,
                date: date,
                data: {},
                ...changes
            })
        } else {
            failedResidents.push(resident?.name || residentId)
        }
    })

    // 保存可能なレコードのみ保存
    if (recordsToSave.length > 0) {
        const result = await upsertDailyRecordsBulk(recordsToSave)
        if (result.error) {
            throw new Error(result.error)
        }
        // 保存成功したレコードだけpendingChangesから削除
        setPendingChanges(prev => {
            const newMap = new Map(prev)
            recordsToSave.forEach(r => newMap.delete(r.resident_id))
            return newMap
        })
    }

    return { 
        savedCount: recordsToSave.length, 
        failedCount: failedResidents.length,
        failedResidents 
    }
})
```

---

## 検証計画

### 手動テスト

1. **ブラウザでテスト**
   - `http://localhost:3000/daily-reports` にアクセス
   - 複数の利用者のデータを入力（一部は正しく、一部はエラー状態で）
   - 保存ボタンをクリック
   - 期待結果:
     - エラーのない人: 保存成功
     - エラーのある人: 保存されず、エラー表示が残る
     - 日中活動エラー時: GH、日中活動、その他福祉サービスの3項目すべてが赤くハイライト
     - 夜間エラー時: GH泊、救急搬送、入院、外泊の4項目すべてが赤くハイライト
