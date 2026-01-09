# コードベース監査レポート - infrared-rocket

> 📅 監査日: 2026-01-06  
> 🎯 対象: `c:\Users\ktana\.gemini\antigravity\playground\infrared-rocket`

---

## 🚨 Critical (修正必須のバグ・リスク)

### 1. 型キャストによる実行時エラーリスク

| ファイル | 問題点 | 修正案 |
|---------|--------|--------|
| [notifications.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/actions/notifications.ts) | `as unknown as` を3箇所で使用（L92, L180, L239）。Supabaseの戻り値を強制キャストしており、型不整合時に実行時エラーの可能性がある | Supabaseの`select()`でジェネリクスを使用するか、戻り値を適切な型ガードでチェック |

```typescript
// 現状（危険）
return data as unknown as (FacilityNotification & { created_staff?: { name: string } | null })[]

// 推奨
type NotificationWithStaff = FacilityNotification & { created_staff?: { name: string } | null }
// 適切なnullチェック後にreturn
```

---

### 2. エラーハンドリングの欠落

| ファイル | 問題点 | 修正案 |
|---------|--------|--------|
| [invite.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/actions/invite.ts) L91 | `validateInviteToken`で`createAdminClient()`呼び出し時に`try-catch`がない。環境変数未設定時にクラッシュ | `generateInviteLink`と同様の`try-catch`パターンを適用 |
| [daily-report-validation.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/lib/daily-report-validation.ts) L61 | `console.log` がバリデーション中に残っている（開発用） | プロダクション環境向けに削除 |

---

### 3. 認証チェックの不整合

| ファイル | 問題点 | 修正案 |
|---------|--------|--------|
| [get-hq-daily-data.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/actions/hq/get-hq-daily-data.ts) L23-25 | Admin権限チェックなしで`staff.facility_id`を使用。AdminユーザーはfacilityIdがnullの場合があり、データ取得に失敗する可能性 | `get-medical-v-data.ts`と同様のAdmin分岐ロジックを追加 |

---

## ⚠️ Warning (リファクタリング推奨)

### 1. `any` 型の多用（50箇所以上）

> [!WARNING]
> 型安全性が大幅に低下しています。段階的に修正を推奨。

**主な問題箇所:**

| ファイル | 箇所数 | 主な用途 |
|---------|--------|---------|
| [global-save-context.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/components/providers/global-save-context.tsx) | 8箇所 | errors/warnings配列、sharedState |
| [daily-report-grid.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/components/features/daily-report/daily-report-grid.tsx) | 10箇所+ | レコードデータアクセス `(data as any)?.is_gh` |
| [findings.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/actions/findings.ts) | 3箇所 | payload構築、recordsのmap |
| [staff-form-dialog.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/(dashboard)/staffs/staff-form-dialog.tsx) | 2箇所 | currentStaff, initialData |
| [resident-form-dialog.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/(dashboard)/residents/resident-form-dialog.tsx) | 2箇所 | currentStaff, initialData |

**修正案:**
```typescript
// 例: global-save-context.tsx
// 現状
type ValidateFn = () => { isValid: boolean; errors: any[]; warnings: any[] }

// 推奨
import { ValidationError, ValidationWarning } from '@/lib/daily-report-validation'
type ValidateFn = () => { isValid: boolean; errors: ValidationError[]; warnings: ValidationWarning[] }
```

---

### 2. 冗長なデータアクセスパターン

| ファイル | 問題点 | 修正案 |
|---------|--------|--------|
| [daily-report-grid.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/components/features/daily-report/daily-report-grid.tsx) L81-88, L136-143 | `(data as any)?.is_gh ?? record?.is_gh ?? false` パターンが10回以上繰り返し | ヘルパー関数`getRecordValue(data, record, key, defaultValue)`を作成 |

```typescript
// 推奨: ヘルパー関数
function getRecordValue<K extends keyof DailyRecord>(
  data: Record<string, unknown> | undefined,
  record: Partial<DailyRecord> | undefined,
  key: K,
  defaultValue: DailyRecord[K]
): DailyRecord[K] {
  return (data?.[key] ?? record?.[key] ?? defaultValue) as DailyRecord[K]
}
```

---

### 3. 冗長なロジック（DRY違反）

| ファイル | 問題点 | 修正案 |
|---------|--------|--------|
| [findings.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/actions/findings.ts) | `getFindingsCountByRecord`と`getFindingsCountByRange`が95%同一コード | 共通関数に抽出し、dateフィルタ条件のみ引数で分岐 |
| [notifications.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/actions/notifications.ts) | `getResolvedNotifications`と`getFacilityNotifications`のフィルタロジックが重複 | 共通のqueryビルダー関数を作成 |

---

### 4. 不要な再レンダリングリスク

| ファイル | 問題点 | 修正案 |
|---------|--------|--------|
| [daily-report-grid.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/components/features/daily-report/daily-report-grid.tsx) L108-110 | `useEffect`内で`runValidation()`を呼び出し＋依存配列に`runValidation`を含む。`localData`変更毎に再レンダリングが発生 | `runValidation`を`useCallback`の依存から外すか、デバウンス処理を追加 |

---

## 🗑️ Cleanup (削除・整理)

### 1. 開発用 `console.log` の残存（100箇所以上）

> [!CAUTION]
> 本番環境でログが漏洩する可能性があります。

**対象ファイル（プロダクションコード）:**
- [auth-helpers.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/lib/auth-helpers.ts): 7箇所
- [admin-auth.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/actions/admin-auth.ts): 20箇所以上
- [daily-report-validation.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/lib/daily-report-validation.ts): 2箇所
- [daily-report-grid.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/components/features/daily-report/daily-report-grid.tsx): 4箇所
- [global-save-context.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/components/providers/global-save-context.tsx): 1箇所

**修正案:**
- 開発用ログは`if (process.env.NODE_ENV === 'development')`でラップ
- または専用のloggerユーティリティを作成

---

### 2. スクリプトファイル内の `console.log`（許容範囲）

`scripts/`フォルダ内のファイルは開発・デバッグ用のため、現状維持で問題なし。

---

### 3. 未使用インポートの可能性

| ファイル | 確認事項 |
|---------|---------|
| [invite.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/actions/invite.ts) L7 | `redirect` がインポートされているが未使用 |

---

## 📊 優先度マトリクス

| 優先度 | カテゴリ | 項目数 | 推奨アクション |
|--------|---------|--------|---------------|
| 🔴 高 | Critical | 3件 | 即時修正 |
| 🟡 中 | Warning (any型) | 50箇所+ | スプリント計画に組み込む |
| 🟡 中 | Warning (冗長性) | 4件 | リファクタリング時に対応 |
| 🟢 低 | Cleanup (console.log) | 100箇所+ | リリース前に一括削除 |

---

## 次のステップ

1. **「修正を実行して」と指示してください** → Criticalから順に修正を開始します
2. 特定の項目だけ修正したい場合は「○○を修正して」と指定してください
