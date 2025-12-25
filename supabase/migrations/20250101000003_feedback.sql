-- 指摘・コメント機能 (feedback_comments)
CREATE TABLE feedback_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_date DATE NOT NULL,
    facility_id UUID NOT NULL REFERENCES facilities(id),
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_feedback_comments_date ON feedback_comments(report_date, facility_id);
