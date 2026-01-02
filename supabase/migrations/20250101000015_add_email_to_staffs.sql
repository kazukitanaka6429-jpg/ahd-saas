-- staffs テーブルに email カラムを追加
-- アカウント招待機能で使用

ALTER TABLE staffs ADD COLUMN IF NOT EXISTS email TEXT;

-- インデックス追加（検索・一意性確認用）
CREATE INDEX IF NOT EXISTS idx_staffs_email ON staffs(email);

COMMENT ON COLUMN staffs.email IS 'ログイン用メールアドレス（Supabase Auth と連携）';
