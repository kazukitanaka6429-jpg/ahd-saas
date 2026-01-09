-- Add display_id column to residents table
-- Type: INTEGER, Required: YES (NOT NULL), Unique: Per Organization

-- Step 1: Add organization_id column to residents (for organization-level uniqueness)
ALTER TABLE residents ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Step 2: Populate organization_id from facility's organization_id
UPDATE residents r
SET organization_id = f.organization_id
FROM facilities f
WHERE r.facility_id = f.id
AND r.organization_id IS NULL;

-- Step 3: Add display_id column (initially nullable for existing data)
ALTER TABLE residents ADD COLUMN IF NOT EXISTS display_id INTEGER;

-- Step 4: Create unique index on (organization_id, display_id)
-- Note: This will allow NULL display_ids until user fills them in
CREATE UNIQUE INDEX IF NOT EXISTS idx_residents_org_display_id 
ON residents(organization_id, display_id) 
WHERE display_id IS NOT NULL;

-- Step 5: After all existing residents have display_id filled in,
-- run this to make it NOT NULL (do this manually after data entry):
-- ALTER TABLE residents ALTER COLUMN display_id SET NOT NULL;

-- Note: Run the NOT NULL constraint only after all existing residents have been assigned display_ids.
