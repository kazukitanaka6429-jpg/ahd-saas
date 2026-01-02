-- staffs テーブルに招待トークンカラムを追加
-- 招待リンク共有方式で使用

ALTER TABLE staffs 
ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE;

-- インデックス追加（トークン検索用）
CREATE INDEX IF NOT EXISTS idx_staffs_invite_token ON staffs(invite_token);

COMMENT ON COLUMN staffs.invite_token IS '招待リンク用トークン（使用後はNULLにクリア）';
