# Phase 3: 本社日次確認画面（HQ Daily Check）

## 1. 準備 (Preparation)
- [x] 既存スキーマとコードベースの調査
- [ ] 実装計画書 (`implementation_plan.md`) の作成
- [ ] ユーザーへの計画承認依頼

## 2. データベース実装 (Database)
- [ ] `external_billing_imports` テーブル作成用マイグレーションファイルの作成
- [ ] マイグレーションの適用（ローカル環境）

## 3. バックエンド実装 (Server Actions)
- [ ] CSVアップロードとパース処理 (`actions/import-billing-csv.ts`)
- [ ] マトリクスデータ取得処理 (`actions/get-hq-daily-data.ts`)
  - `daily_records` と `external_billing_imports` の結合
  - 5行構造へのデータ整形

## 4. フロントエンド実装 (UI/UX)
- [ ] ページレイアウトの作成 (`app/(dashboard)/hq/daily/page.tsx`)
- [ ] マトリクスコンポーネント (`components/hq/HqCheckMatrix.tsx`)
  - [ ] Sticky Left, Sticky Right, Scrollable Center の構造実装
  - [ ] 5行（朝食・昼食・夕食・日中・夜勤）のレンダリング
  - [ ] クリックによるデータ修正機能
  - [ ] 差分強調表示（赤色背景）
- [ ] CSVインポートモーダル/ボタンの実装

## 5. 検証 (Verification)
- [ ] インポート機能のテスト
- [ ] 表示崩れの確認（横スクロール、Sticky動作）
- [ ] データ整合性の確認（SaaS vs CSV）
