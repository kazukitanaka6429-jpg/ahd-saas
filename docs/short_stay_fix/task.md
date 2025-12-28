# ショートステイ保存エラー修正タスク

- [x] 原因調査
    - [x] コードベース内での `short_stay_records` の使用箇所特定
    - [x] マイグレーションファイルの確認 (`supabase/migrations/20250101000008_short_stay_v2.sql`)
    - [x] データベースへのテーブル存在確認 (Confirmed missing on Remote)
- [x] 修正 (Manual Execution Required)
    - [x] 修正用SQLファイルの作成 (`docs/short_stay_fix/fix_missing_table.sql`)
    - [x] ユーザーによるSQL実行 (Supabase Dashboard)
- [ ] 検証
    - [ ] ユーザーによる手動検証 (Browser)
        - [ ] ショートステイ保存動作
        - [ ] 利用者一覧などの他機能
