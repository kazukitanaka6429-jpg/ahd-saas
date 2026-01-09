-- Restore Admin Role for Headquarters Staff
-- Based on the requirement that "Headquarters" (本社) staff should be system admins.

UPDATE staffs
SET role = 'admin'
WHERE facility_id IN (
    SELECT id FROM facilities WHERE name = '本社'
);

-- Verify the change (Optional, for your check)
-- SELECT * FROM staffs WHERE role = 'admin';
