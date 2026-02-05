# Notifications Feature (Phase 2) Walkthrough

## 実施した変更
スタッフ間のコミュニケーションとシステム通知を強化するため、リアルタイム通知システムを実装しました。

### 1. データベース構築 (`notifications`, `notification_reads`)
- `notifications`: 通知本文、タイプ（info, warning, urgent）、作成日時等を管理。
- `notification_reads`: ユーザーごとの既読ステータスを管理。
- RLSポリシーとRealtime機能を有効化し、セキュアかつ即時性の高いデータ同期を実現。

### 2. バックエンド実装 (`app/actions/system-notifications.ts`)
- `getMyNotifications()`: ユーザーに関連する通知（全体、施設宛、個人宛）を取得し、既読状態を結合して返却。
- `markAsRead()`: 通知を既読にする（`notification_reads` へのレコード挿入）。
- `createSystemNotification()`: 通知を作成する管理者用アクション。

### 3. フロントエンド実装 (`NotificationBell`)
- ヘッダーにベルアイコンを配置し、未読件数をバッジ表示。
- Supabase Realtimeを購読し、新規通知発生時に自動でトースト表示とリスト更新を実施。
- ポップオーバー内で通知一覧の閲覧と既読化が可能。
- ユーザーによる動作検証を実施し、正常動作を確認済み。

## 検証結果
- [x] テスト通知の作成とリアルタイム受信（トースト表示）
- [x] 未読バッジのカウント更新
- [x] 通知一覧の表示と既読処理

## 次のステップ
Phase 3: Medical Record Improvement (医療記録の改善) へ進みます。
