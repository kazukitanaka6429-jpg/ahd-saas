# システム全機能棚卸しレポート

## 1. サイトマップ & 機能一覧
| カテゴリ | 画面名 / パス | 主な機能・役割 | 使用している主要コンポーネント | 状態 |
| :--- | :--- | :--- | :--- | :--- |
| **認証** | ログイン <br> `/login` | ・メール/パスワード認証<br>・パスワードリセット | `LoginForm` | ✅ 完了 |
| **認証** | パスワード更新 <br> `/auth/update-password` | ・初回ログイン時等のパスワード変更 | `UpdatePasswordForm` | ✅ 完了 |
| **ダッシュボード** | トップ <br> `/` | ・お知らせ表示<br>・未読アラート(HQのみ) | `DashboardWidgetsWrapper`<br>`DebugStatus` | ✅ 完了 |
| **業務日誌** | 日誌入力 <br> `/daily-reports` | ・バイタル、食事、排泄、入浴、処置入力<br>・一括保存<br>・シフト管理 | `DailyReportGrid`<br>`StaffShiftSection`<br>`DailyRemarks` | ✅ 完了 |
| **利用者管理** | 利用者一覧 <br> `/residents` | ・利用者情報のCRUD<br>・書類期限アラート表示<br>・施設フィルタ(Adminのみ) | `ResidentFormDialog`<br>`ResidentActions`<br>`ResidentFacilityFilter` | ✅ 完了 |
| **医療連携** | 医療連携体制加算(IV) <br> `/medical-cooperation` | ・看護師の配置実績入力<br>・加算算定マトリクス表示<br>・気付き事項件数表示 | `MedicalCooperationGrid`<br>`MonthSelector` | ✅ 完了 |
| **医療連携** | 医療連携体制加算(V) <br> `/medical-v` | ・訪問看護実績入力<br>・単位数自動計算 | `MedicalVGrid`<br>`MonthSelector` | ✅ 完了 |
| **本社管理** | 日次確認画面 <br> `/hq/daily` | ・全施設の請求予実突合<br>・CSVインポート<br>・外泊/入院状況確認 | `HqCheckMatrix`<br>`BillingImporter` | ✅ 完了 |
| **職員管理** | 職員一覧 <br> `/staffs` | ・職員情報のCRUD<br>・招待リンク発行<br>・管理者/マネージャー権限管理 | `Table`<br>`StaffFormDialog`<br>`InviteDialog` | ✅ 完了 |
| **設定** | ユニット管理 <br> `/settings/units` | ・ユニット（フロア/棟）の登録・編集・削除 | `UnitSettingsPage`<br>`Table`<br>`Dialog` | ✅ 完了 |
| **設定** | 施設管理 <br> `/facilities` (Admin) | ・施設情報の登録・編集 | `Table` (Admin Only) | ✅ 完了 |
| **設定** | 資格管理 <br> `/admin/qualifications` | ・資格マスタ管理（医療連携対象フラグ設定） | `Table` (Admin Only) | ✅ 完了 |

## 2. 詳細機能・ロジック解説

### ユニット管理機能
- **設定画面**: `/settings/units` にてユニット名と表示順を設定可能。
- **データ構造**: `units` テーブルで管理され、`residents.unit_id` で紐付けられる。
- **UIへの反映**:
    - `DailyReportGrid` (`/daily-reports`) にて、登録されたユニットがタブとして表示され、利用者をフィルタリングする機能が実装されている。
    - ユニット未設定の場合は、全ての利用者がフラットに表示される。

### 履歴管理 (利用者マスタ書類)
- **管理場所**: 利用者一覧画面 (`/residents`) の「操作」列にある書類アイコンボタンからアクセス。
- **コンポーネント**: `ResidentActions` 内で `DocumentHistorySection` コンポーネントをダイアログ内に展開。
- **アラートロジック**:
    - `getResidentAlertLevels` (Server Action) により、有効期限切れや期限間近の書類を持つ利用者を特定。
    - ダッシュボード (`/`) ではHQユーザー向けに全施設の未対応アラートを集約表示。
    - 利用者一覧 (`/residents`) では各利用者の名前横にアイコン（赤/橙/青）で警告レベルを表示。

### 医療連携 (IV・V)
- **実装の分離**:
    - **IV (体制加算)**: `/medical-cooperation` 画面。`app/actions/medical-cooperation.ts` を使用。看護配置と対応実績を入力。
    - **V (訪問看護)**: `/medical-v` 画面。`app/actions/medical-v/` 配下のロジックを使用。訪問実績記録と単位数計算に特化。
- **自動計算**:
    - IV: 看護師の配置状況と利用者の重度フラグ (`sputum_suction` 等) に基づく。
    - V: 指導看護師数と実施記録に基づき単位数を算出するロジックが含まれる。

### 本社確認画面 (HQ Check)
- **目的**: 現場の入力データ（SaaSデータ）と、請求ソフトから出力したCSVデータ（Billing Data）の整合性を確認する。
- **仕組み**:
    - `getHqDailyData`: 指定月の全施設の利用者日次データを取得。
    - `Comparison Logic`: 「食事」「日中活動」「夜勤加配」「体制加算」などの項目ごとに、SaaS上の記録回数とCSVインポート値を比較し、不一致 (`mismatch`) をハイライト表示する。
    - CSVインポートは `BillingImporter` コンポーネントを通じて `external_billing_imports` テーブルに保存される。

## 3. 未使用・迷子の可能性 (Code Audit)

コードスキャンの結果、以下のファイルが現在使用されていない、または重複している可能性があります。

### ⚠ Zombies (未使用の可能性が高い)
- **`app/actions/medical-coordination.ts`**
    - **判定理由**: `/medical-cooperation` (IV) と `/medical-v` (V) に機能が分割・移行された形跡がある。このファイルにはIV/V両方のロジックが混在しており、現在のルーティング (`page.tsx`) からは呼び出されていない模様。
    - **推奨**: 内容を精査し、必要なロジックが移行済みであれば削除する。

### ⚠ Redundancy (重複の可能性)
- **`app/actions/staffs.ts`**
    - **判定理由**: `app/actions/staff.ts` (単数形) に主要なCRUDロジックが集約されている。`staffs.ts` は `getStaffListForFilter` という1つの関数しか持っていない。
    - **推奨**: `getStaffListForFilter` を `staff.ts` に移動し、`staffs.ts` を削除してファイルを一本化する。

### ⚠ Underused (使用頻度が低い)
- **`app/actions/notifications.ts`**
    - **判定理由**: 施設から本部への通知機能 (`FacilityNotification`) のロジックだが、現在の主要なUIフロー（ダッシュボード等）では `task.md` で言及されたような「書類アラート」(`resident-documents.ts`) の方が目立っている。
    - **推奨**: 将来的な機能拡張用として保持するか、仕様を確認する。

---
**総評**:
システム全体として、要件定義された主要機能（日誌、マスタ、医療連携、HQ管理）は網羅的に実装されています。一部、開発過程で発生したと思われるサーバーアクションファイルの重複 (`medical-coordination.ts` 等) が残存しているため、これらを整理することで保守性が向上します。
