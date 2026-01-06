# 施設間連絡機能 (Facility Notifications) 実装計画

## 目標
施設（現場）から本社への連絡スムーズに行い、本社側で施設ごとに整理して確認できる機能を実装する。

## ユーザーレビューが必要な事項
- 特になし

## 変更内容

### Database (Supabase)
`facility_notifications` テーブルを作成する。
- `facility_id` (FK), `created_by` (FK)
- `content`, `priority` (high/normal/low), `status` (open/resolved)
- `created_at`, `resolved_at`, `resolved_by` (FK)

### Backend (Server Actions)
#### [NEW] [notifications.ts](file:///c%3A/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/actions/notifications.ts)
- `createNotification`: Server Action。フォームデータを受け取り、DBに保存。
- `getUnresolvedNotifications`: 未解決の通知を取得。`facilities` を JOIN して施設名を含める。
- `resolveNotification`: ステータスを `resolved` に更新。

### Frontend
#### [NEW] [CreateNotificationModal.tsx](file:///c%3A/Users/ktana/.gemini/antigravity/playground/infrared-rocket/components/common/CreateNotificationModal.tsx)
- 送信フォーム（内容、重要度）。
- Server Action を呼び出す。

#### [NEW] [NotificationWidget.tsx](file:///c%3A/Users/ktana/.gemini/antigravity/playground/infrared-rocket/components/dashboard/NotificationWidget.tsx)
- 通知データを取得し、施設ごとにグルーピングして表示。
- 重要度 'high' がある場合はヘッダーを強調。
- 解決ボタンで `resolveNotification` を呼び出す。

#### [MODIFY] [Header.tsx](file:///c%3A/Users/ktana/.gemini/antigravity/playground/infrared-rocket/components/layout/Header.tsx) (仮定)
- 「本社へ連絡」ボタンを追加し、モーダルを開く。

#### [MODIFY] [DashboardPage](file:///c%3A/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/(dashboard)/page.tsx) (仮定)
- `NotificationWidget` を配置。

## 検証計画
### 自動テスト
- なし

### 手動検証
1. 施設アカウントでログイン（または施設を選択）。
2. ヘッダーの「本社へ連絡」から通知（Normal, High）を送信。
3. DBにレコードが作成されたか確認。
4. 本社ダッシュボードで、施設ごとに通知が表示されるか確認。
5. Highの通知がある施設が強調されているか確認。
6. 「確認ボタン」で完了済みになり、リストから消えるか確認。
