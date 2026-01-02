# スタッフ メール招待機能 (パターンA)

## 概要
既存の職員マスタをSupabase Authと連携させ、メール招待でログイン可能にする機能を実装する。

## タスク

### 1. バックエンド
- [x] Service Role クライアントの作成 (`lib/supabase/admin.ts`)
- [x] 招待用 Server Action の作成 (`app/actions/admin-auth.ts`)
  - `inviteStaff(email, staffId)` を実装
  - `supabase.auth.admin.inviteUserByEmail()` を使用
  - 権限チェック（admin/manager のみ）

### 2. 職員一覧画面 (StaffList)
- [x] 各行に招待ステータス表示を追加
  - `auth_user_id` が `null` → 「✉️ 招待」ボタン
  - `auth_user_id` がある → 「✅ 登録済み」バッジ
- [x] 招待モーダルの作成（メールアドレス入力）
- [x] 招待成功時のToast表示

### 3. パスワード設定画面
- [x] `/auth/update-password/page.tsx` を作成
- [x] `UpdatePasswordForm` コンポーネントを作成
- [x] `supabase.auth.updateUser({ password })` でパスワード確定
- [x] 完了後ダッシュボードへリダイレクト

### 4. 検証
- [x] ビルド確認
- [ ] 動作テスト（手動）
