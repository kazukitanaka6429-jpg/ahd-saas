-- Audit Log Immutability: Prevent UPDATE and DELETE on operation_logs
-- This ensures the audit trail cannot be tampered with, even by administrators.

-- Drop existing policies that might allow update/delete
DROP POLICY IF EXISTS "Prevent update on operation_logs" ON operation_logs;
DROP POLICY IF EXISTS "Prevent delete on operation_logs" ON operation_logs;

-- Explicitly deny UPDATE for all roles
CREATE POLICY "Prevent update on operation_logs"
    ON operation_logs FOR UPDATE
    TO authenticated
    USING (false);

-- Explicitly deny DELETE for all roles
CREATE POLICY "Prevent delete on operation_logs"
    ON operation_logs FOR DELETE
    TO authenticated
    USING (false);

-- Add index for archive filtering (created_at range queries)
CREATE INDEX IF NOT EXISTS idx_operation_logs_archive
    ON operation_logs(created_at DESC);
