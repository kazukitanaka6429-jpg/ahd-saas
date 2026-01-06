# 施設間連絡機能 (Facility Notifications) 実装確認

## 変更内容
- **Database**: `facility_notifications` テーブルを追加。
- **Backend**: `actions/notifications.ts` に送信・取得・解決用のアクションを実装。
- **Frontend**:
    - `components/common/CreateNotificationModal.tsx`: 送信モーダルを作成。`Sidebar` に配置し、施設側（Admin以外）からアクセス可能に。
    - `components/dashboard/NotificationWidget.tsx`: 通知表示ウィジェットを作成。`Dashboard` に配置し、本社（Admin）のみ表示。

## 検証方法（手動）

### 1. 送信機能 (施設側)
1. StaffまたはManager権限でログイン（またはシミュレーション）。
2. サイドバーの「本社へ連絡」ボタンをクリック。
3. モーダルで「重要度」と「内容」を入力し送信。
4. DBの `facility_notifications` テーブルにレコードが作成されたことを確認。

### 2. 表示・解決機能 (本社側)
1. Admin (HQ) 権限でログイン。
2. ダッシュボードトップに「施設からの連絡」ウィジェットが表示されていることを確認。
3. 送信した内容が、施設ごとにグルーピングされて表示されているか確認。
4. 重要度「高」の場合、ヘッダーが赤く強調表示されるか確認。
5. 「確認」ボタンを押し、リストから消える（StatusがResolvedになる）ことを確認。
