# スタッフ メール招待機能 (パターンA) 実装計画

既存の職員データを Supabase Auth と連携させ、管理者がメールで招待できる機能を実装する。

## User Review Required

> [!IMPORTANT]
> **Service Role Key が必要です**
> 
> `supabase.auth.admin.inviteUserByEmail()` を使用するには、環境変数 `SUPABASE_SERVICE_ROLE_KEY` が必要です。
> `.env.local` に以下を追加してください：
> ```
> SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
> ```

## Proposed Changes

### Supabase Admin クライアント

#### [NEW] [admin.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/lib/supabase/admin.ts)

Service Role Key を使用した管理者権限クライアントを作成。
- Server Actions 専用（クライアントサイドでは使用不可）
- `supabase.auth.admin.*` 系のメソッドが使用可能になる

---

### Server Action

#### [NEW] [admin-auth.ts](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/actions/admin-auth.ts)

`inviteStaff(email: string, staffId: string)` を実装：
1. 現在のユーザーが `admin` または `manager` か確認
2. `supabaseAdmin.auth.admin.inviteUserByEmail(email)` を実行
3. 返却された `user.id` で `staffs` テーブルを更新：
   - `auth_user_id = user.id`
   - `email = email`（追加フィールド）
4. 成功/エラーを返却

---

### 職員管理画面

#### [MODIFY] [page.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/(dashboard)/staffs/page.tsx)

各職員行にステータス表示を追加：
- `auth_user_id` が `null` → `InviteStaffButton` を表示
- `auth_user_id` がある → 「✅ 登録済み」バッジ表示

#### [NEW] [invite-staff-dialog.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/(dashboard)/staffs/invite-staff-dialog.tsx)

個別職員の招待用ダイアログ：
- メールアドレス入力フィールド（職員にメールがあればプレフィル）
- 「招待メール送信」ボタン → `inviteStaff` を実行
- 成功時 Toast 表示

---

### パスワード設定画面

#### [NEW] [page.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/auth/update-password/page.tsx)

招待メールのリンク（`/auth/update-password?token_hash=...&type=invite`）から着地。
- Supabase が自動でセッションを復元
- パスワード入力フォームを表示

#### [NEW] [update-password-form.tsx](file:///c:/Users/ktana/.gemini/antigravity/playground/infrared-rocket/app/auth/update-password/update-password-form.tsx)

パスワード設定フォーム：
- 新パスワード入力（確認含む）
- `supabase.auth.updateUser({ password })` で確定
- 完了後 `/` へリダイレクト

---

### DB スキーマ（任意）

#### [OPTIONAL] staffs テーブルに email カラム追加

現状 `staffs` テーブルに `email` カラムがない場合、追加が必要：
```sql
ALTER TABLE staffs ADD COLUMN IF NOT EXISTS email TEXT;
```

## Verification Plan

### Automated Tests
```bash
npm run build
```
ビルドエラーがないことを確認。

### Manual Verification
1. 職員一覧で招待ボタン表示を確認
2. メールアドレスを入力して招待を実行
3. 招待メールのリンクからパスワード設定
4. ログイン成功を確認
