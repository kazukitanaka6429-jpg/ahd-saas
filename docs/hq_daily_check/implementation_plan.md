# Phase 3: 本社日次確認画面（HQ Daily Check）実装計画

## 概要
各拠点の管理者が月末に確認する「現場入力データと請求用CSVの突合・監査機能」を実装します。
SaaSに入力された日次記録（食事、日中活動、夜間支援）と、外部請求ソフトからインポートしたCSVデータをマトリクス形式で比較し、差異を可視化します。

## ユーザーレビューが必要な事項
- **夜勤加配の定義**: SaaS上の `is_gh_night` (GH泊) を「夜勤加配」として扱います。
- **CSVフォーマット**: ユーザー提示の画像 (`image_288961.png`) に基づき、B列(利用者名)、AB列(項目名)、AD列(数量) を使用します。文字コードはShift-JISまたはUTF-8を想定（Win環境ならShift-JISの可能性大ですが、現状はUTF-8前提で実装し、必要ならエンコーディング対応を追加）。

## 変更内容 (Proposed Changes)

### データベース (Database)

#### [NEW] `supabase/migrations/20250101000009_hq_daily_check.sql`
- `external_billing_imports` テーブルを追加
  - `id`: UUID (PK)
  - `facility_id`: UUID (FK)
  - `target_month`: DATE (対象月 1日)
  - `resident_name`: TEXT
  - `item_name`: TEXT
  - `quantity`: INTEGER
  - `amount`: INTEGER
  - `created_at`: TIMESTAMP
  - `UNIQUE(facility_id, target_month, resident_name, item_name)`

### バックエンド (Server Actions)

#### [NEW] `app/actions/hq/import-billing-csv.ts`
- `importBillingCsv(formData: FormData)`: CSVファイルをパースし、`external_billing_imports` にUpsertする。
- 既存データを同月・同施設で洗い替え（またはOn Conflict Update）。

#### [NEW] `app/actions/hq/get-hq-daily-data.ts`
- `getHqDailyData(facilityId, year, month)`:
  - `residents` 取得
  - `daily_records` 取得 (指定月)
  - `external_billing_imports` 取得 (指定月)
  - データを結合し、利用者ごとの5行データを生成して返す。

### フロントエンド (UI/UX)

#### [NEW] `app/(dashboard)/hq/daily/page.tsx`
- ページレイアウト。年/月選択、施設選択（必要であれば）、CSVインポートボタン、マトリクス表示。

#### [NEW] `components/hq/billing-importer.tsx`
- CSVファイル選択とアップロード実行用コンポーネント。

#### [NEW] `components/hq/hq-check-matrix.tsx`
- `TanStack Table` またはCSS Grid/Flexを用いたマトリクス実装。
- **Sticky Layout**:
  - Left: 利用者情報、項目名
  - Center: 1日〜31日 (横スクロール)
  - Right: SaaS計、CSV計、判定
- **行構成 (5 Rows)**:
  1. 朝食 (`bg-blue-50`) -> `meal_breakfast`
  2. 昼食 (`bg-orange-50`) -> `meal_lunch`
  3. 夕食 (`bg-red-50`) -> `meal_dinner`
  4. 日中活動 (`bg-green-50`) -> `daytime_activity`
  5. 夜勤加配 (`bg-purple-50`) -> `is_gh_night`
- **インタラクション**:
  - セルクリックで `daily_records` を直接更新 (Server Action呼び出し)。
  - 数量不一致の場合、判定列を赤背景 (`bg-red-500`)・白文字で表示。

## 検証計画 (Verification Plan)

### 自動テスト (Automated Tests)
- 現状、E2Eテスト環境がないため、手動検証を主とします。

### 手動検証 (Manual Verification)
1. **マイグレーション適用**:
   - `supabase db push` (またはローカル環境での適用) が成功すること。
2. **CSVインポート**:
   - サンプルCSVを作成し、アップロード。DBに正しく格納されることを確認。
   - 重複データ投入時、エラーにならず更新されること。
3. **画面表示**:
   - `/hq/daily` にアクセス。
   - 左・右カラムが固定され、中央のみスクロールすること。
   - 5つの行が正しい色で表示されること。
4. **データ連携**:
   - 日付セルをクリックし、チェックON/OFFが切り替わること。
   - チェックONの数と「SaaS数量」が一致すること。
   - CSVデータがある場合、「CSV数量」に表示されること。
   - 数量不一致時、「判定」が赤くなること。
