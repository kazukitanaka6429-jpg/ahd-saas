-- 1. Add organization_id column to staffs (initially nullable for migration)
ALTER TABLE "staffs" ADD COLUMN "organization_id" UUID REFERENCES "organizations"("id");

-- 2. Backfill organization_id based on facility
-- (Assumes facilities have organization_id set properly. If not, we might need to set a default Org ID first)
-- Let's assume organization_id exists on facilities as per typical schema.
UPDATE "staffs" s
SET "organization_id" = f."organization_id"
FROM "facilities" f
WHERE s."facility_id" = f."id";

-- 3. Check for any staffs that didn't get updated (e.g. invalid facility_id?)
-- If any remain null, we need to handle them. For now, we enforce constraint after update.
-- But wait, we need to make sure we have at least one Organization. 
-- In this specific project, if organizations table is empty, we must create one.

DO $$
DECLARE
    default_org_id UUID;
BEGIN
    -- Ensure at least one organization exists
    IF NOT EXISTS (SELECT 1 FROM "organizations") THEN
        INSERT INTO "organizations" ("name", "code") VALUES ('Default Corp', 'DEFAULT') RETURNING "id" INTO default_org_id;
    ELSE
        SELECT "id" INTO default_org_id FROM "organizations" LIMIT 1;
    END IF;

    -- Update facilities if they are missing organization_id (just in case)
    UPDATE "facilities" SET "organization_id" = default_org_id WHERE "organization_id" IS NULL;

    -- Re-run staff update in case some facilities were updated just now
    UPDATE "staffs" s
    SET "organization_id" = f."organization_id"
    FROM "facilities" f
    WHERE s."facility_id" = f."id" AND s."organization_id" IS NULL;
    
    -- Fallback: If still NULL (orphaned?), set to default
    UPDATE "staffs" SET "organization_id" = default_org_id WHERE "organization_id" IS NULL;
END $$;

-- 4. Enforce NOT NULL on organization_id
ALTER TABLE "staffs" ALTER COLUMN "organization_id" SET NOT NULL;

-- 5. Make facility_id Nullable
ALTER TABLE "staffs" ALTER COLUMN "facility_id" DROP NOT NULL;

-- 6. Migrate HQ Admin
-- Find staff currently in '本社' facility and move them to Org-level Admin
UPDATE "staffs"
SET "facility_id" = NULL, "role" = 'admin'
WHERE "facility_id" IN (
    SELECT "id" FROM "facilities" WHERE "name" = '本社'
);

-- 7. Remove '本社' Facility
DELETE FROM "facilities" WHERE "name" = '本社';
