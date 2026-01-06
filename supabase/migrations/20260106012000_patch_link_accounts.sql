-- Patch to link accounts for kazuki.tanaka6429
-- Target Auth ID (Current Login): 60115647-2f44-4dcb-a37d-354251c57b0d

-- 1. Updates records with the target email to use the correct Auth ID
UPDATE staffs 
SET auth_user_id = '60115647-2f44-4dcb-a37d-354251c57b0d' 
WHERE email = 'kazuki.tanaka6429@gmail.com';

-- 2. Ensure the main admin account also has the email set (for consistency)
UPDATE staffs 
SET email = 'kazuki.tanaka6429@gmail.com' 
WHERE auth_user_id = '60115647-2f44-4dcb-a37d-354251c57b0d' AND email IS NULL;
