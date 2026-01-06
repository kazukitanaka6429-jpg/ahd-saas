# 施設間連絡機能 (Facility Notifications) 実装タスク

- [ ] データベース構築
    - [ ] `facility_notifications` テーブル作成SQLの作成と実行
- [ ] バックエンド実装 (Server Actions)
    - [ ] `actions/notifications.ts` 作成
        - [ ] `createNotification` 実装
        - [ ] `getUnresolvedNotifications` 実装
        - [ ] `resolveNotification` 実装
- [ ] フロントエンド実装 (components)
    - [ ] `components/common/CreateNotificationModal.tsx` 作成 (送信モーダル)
    - [ ] `components/dashboard/NotificationWidget.tsx` 作成 (本社用ダッシュボード表示)
- [ ] 統合と確認
    - [ ] ヘッダー等への送信ボタン配置
    - [ ] ダッシュボードへのウィジェット配置
    - [ ] 動作確認 (送信 -> 表示 -> 完了)
