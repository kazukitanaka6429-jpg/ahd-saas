# 実装計画書: 介護施設向けSaaSプラットフォーム

## 1. プロジェクト概要
Googleスプレッドシート運用の限界を解消し、マルチテナント対応の堅牢なSaaS基盤を構築する。
**Killer Feature**: 業務データの特定項目に紐付く「指摘チャット機能」によるコミュニケーションの質的向上。

## 2. 技術スタック & アーキテクチャ
- **Frontend**: Next.js 14+ (App Router), TypeScript
- **UI Framework**: Tailwind CSS, Shadcn/UI (Radix UI base)
- **Grid Component**: TanStack Table (Headlessで柔軟なグリッド実装)
- **Backend/DB**: Supabase (PostgreSQL 15+, Auth, Realtime)
- **Design System**: Atomic Design inspired, Feature-based folder structure

### ディレクトリ構成案
```
/app
  /(auth)         # 認証関連（ログイン等）
  /(dashboard)    # ログイン後のメイン画面
    /facilities   # 施設管理
    /staffs       # 職員管理
    /residents    # 利用者管理
    /daily-reports # 日誌入力（グリッド/チャット）
    /analysis     # 分析ダッシュボード
/components
  /ui             # Shadcn共通コンポーネント
  /features       # 機能別コンポーネント (Grid, Chat等)
    /daily-report
      - DailyReportGrid.tsx
      - MobileEntryCard.tsx
      - ReportCommentSidebar.tsx
/lib
  /supabase       # Client/Server Utilities
  /utils          # Helper functions
/types            # DB型定義など
```

## 3. データベース設計 (Schema Definition Draft)
スケーラビリティと「縦持ち」構造を考慮したスキーマ設計。

### 3.1 マスタ (Masters)
#### `facilities` (施設)
- `id`: UUID (PK)
- `name`: Text
- `code`: Validated String (Unique, 既存システム連携用)
- `settings`: JSONB (施設ごとの独自設定など)

#### `staffs` (職員)
- `id`: UUID (PK)
- `facility_id`: UUID (FK)
- `auth_user_id`: UUID (Supabase Auth Link)
- `name`: Text
- `role`: Enum (admin, manager, staff)
- `status`: Enum (active, retired)

#### `residents` (利用者)
- `id`: UUID (PK)
- `facility_id`: UUID (FK)
- `name`: Text
- `care_level`: Text (要介護度)
- `status`: Enum (in_facility, hospitalized, home_stay)
- `start_date`: Date (入所日)

### 3.2 業務データ (Transaction Data)
#### `report_entries` (日誌明細 - 縦持ち構造)
スプレッドシートの「セル」に相当する最小単位。
- `id`: UUID (PK)
- `facility_id`: UUID (FK) - クエリ最適化用（パーティショニング考慮）
- `date`: Date - 対象日
- `resident_id`: UUID (FK) - 利用者
- `item_category`: Text - (例: 'vital', 'meal', 'bath')
- `item_key`: Text - (例: 'temperature_am', 'lunch_main_intake')
- `value`: Text/JSONB - 入力値 (数値、文字列、選択肢)
- `updated_by`: UUID (FK staffs)
- `updated_at`: Timestamp

> **Note**: JSONBで1レコードに1日分をまとめる案もありますが、
> 「項目単位でのチャット」「分析のしやすさ」を最優先し、まずは正規化された縦持ち（EAVに近い形式）または
> カテゴリ単位での縦持ちを推奨します。パフォーマンス懸念がある場合は `(facility_id, date)` でのパーティショニングを行います。

### 3.3 コミュニケーション (Communication)
#### `comments` (指摘チャット)
- `id`: UUID (PK)
- `report_entry_id`: UUID (FK) - **特定の入力項目に紐付く**
- `facility_id`: UUID (FK)
- `author_id`: UUID (FK staffs)
- `content`: Text
- `status`: Enum (open, pending, resolved) - 指摘、回答中、完了
- `created_at`: Timestamp

## 4. UI設計詳細
### PC: グリッド入力 (Spreadsheet-like)
- **TanStack Table** を採用し、キーボード操作（矢印キー移動、Enterで確定）を実装。
- セルクリックで編集モード、右クリックまたはアイコンクリックで「コメント（指摘）」サイドバーを展開。
- 該当セルにコメントがある場合、赤三角などのインジケーターを表示。

### Mobile: カード/リストビュー
- `DailyReportGrid` コンポーネント内で `useMediaQuery` または CSS Container Queries を使用。
- スマホでは利用者ごとのカードを表示し、タップして詳細入力フォームへ遷移する形がUX上好ましい。

## 5. ロジック移行方針 (GAS to TypeScript)
- 「洗い替え計算」や「日次転記」は、Supabase **Edge Functions** (Deno) または **Postgres Functions (PL/pgSQL)** に実装し、信頼性を担保する。
- トリガー: データ更新時またはCron実行。

## 6. 次のステップ (レビュー依頼)
上記のDBスキーマと構成案についてご確認をお願いします。
承認いただければ、Supabaseプロジェクトのセットアップとテーブル作成に進みます。
