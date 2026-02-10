-- Ensure feedback_comments table exists
CREATE TABLE IF NOT EXISTS feedback_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_date DATE NOT NULL,
    facility_id UUID NOT NULL REFERENCES facilities(id),
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add created_by column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback_comments' AND column_name = 'created_by') THEN
        ALTER TABLE feedback_comments ADD COLUMN created_by UUID REFERENCES staffs(id);
    END IF;
END $$;

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_feedback_comments_date ON feedback_comments(report_date, facility_id);
