
-- Check Admin's Org ID
SELECT id, email, role, organization_id, facility_id FROM staffs WHERE auth_user_id = auth.uid();

-- Check Facilities Org IDs
SELECT id, name, organization_id FROM facilities;
