# 施設切り替え機能の実装計画

## 目標
法人内に複数の拠点（施設）がある場合、業務日誌・医療連携Ⅳ・医療連携Ⅴの各画面でスムーズに施設を切り替えられるようにします。

## 要件定義との整合性
- **マルチテナント/SaaS要件**: 法人（Organization）が複数の施設（Facility）を持つ構造は本システムの基本設計です。
- **管理者機能**: 本部（HQ）やエリアマネージャーが各施設の状況を横断的に確認・入力するフローは必須業務です。
- **データ分離**: 切り替え対象は「同一法人内の施設」に限定されるため、RLS（Row Level Security）によるデータ分離原則に反しません。

## 実装内容

### 1. `FacilitySwitcher` の汎用化
現在サイドバー向けに特化している `FacilitySwitcher` コンポーネントを、ページヘッダーでも使用できるよう改修します。
- `variant` プロパティを追加（`sidebar` | `header`）。
- ヘッダー配置用のスタイル定義を追加。

### 2. 各画面への配置
以下の3画面のヘッダー部分に施設切り替えドロップダウンを配置し、現在選択中の施設名を正しく表示します。

#### [MODIFY] [app/(dashboard)/daily-reports/page.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/(dashboard)/daily-reports/page.tsx)
- 現在のハードコードされている施設名表示（`'ABCリビング'`）を修正し、DBから取得した正しい施設名を表示。
- ヘッダーに `FacilitySwitcher` を追加。

#### [MODIFY] [app/(dashboard)/medical-cooperation/page.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/(dashboard)/medical-cooperation/page.tsx)
- ヘッダーに `FacilitySwitcher` を追加。

#### [MODIFY] [app/(dashboard)/medical-v/page.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/(dashboard)/medical-v/page.tsx)
- ヘッダーに `FacilitySwitcher` を追加。

## 検証計画
1.  **管理者アカウント（複数施設所持）でログインする。**
2.  **各画面でドロップダウンが表示されるか確認する。**
3.  **切り替え操作を行い、URL（`?facility_id=...`）が更新され、データが切り替わるか確認する。**
4.  **正しく対応する施設名は表示されているか確認する。**
