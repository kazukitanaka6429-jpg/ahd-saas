-- 1. Add organization_id column to staffs
ALTER TABLE "staffs" ADD COLUMN IF NOT EXISTS "organization_id" UUID REFERENCES "organizations"("id");

-- 2. Backfill organization_id
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

    -- Update facilities if they are missing organization_id
    UPDATE "facilities" SET "organization_id" = default_org_id WHERE "organization_id" IS NULL;

    -- Update staffs using facility linkage
    -- Use COALESCE to fallback to default immediately if facility link is broken for some reason
    UPDATE "staffs" s
    SET "organization_id" = COALESCE(f."organization_id", default_org_id)
    FROM "facilities" f
    WHERE s."facility_id" = f."id" AND s."organization_id" IS NULL;
    
    -- Fallback for completely orphaned staffs
    UPDATE "staffs" SET "organization_id" = default_org_id WHERE "organization_id" IS NULL;
END $$;

-- 4. Enforce NOT NULL on organization_id
ALTER TABLE "staffs" ALTER COLUMN "organization_id" SET NOT NULL;

-- 5. Make facility_id Nullable
ALTER TABLE "staffs" ALTER COLUMN "facility_id" DROP NOT NULL;

-- 6. Migrate HQ Admin
UPDATE "staffs"
SET "facility_id" = NULL, "role" = 'admin'
WHERE "facility_id" IN (
    SELECT "id" FROM "facilities" WHERE "name" = '本社'
);

-- 7. Remove '本社' Facility AND its related data (Fixing the FK error V2)
DO $$
DECLARE
    hq_facility_id UUID;
BEGIN
    SELECT "id" INTO hq_facility_id FROM "facilities" WHERE "name" = '本社';
    
    IF hq_facility_id IS NOT NULL THEN
        -- Delete related data from medical_coord_v_records first
        -- Correct column name: medical_coord_v_daily_id
        DELETE FROM "medical_coord_v_records" 
        WHERE "medical_coord_v_daily_id" IN (
            SELECT id FROM "medical_coord_v_daily" WHERE "facility_id" = hq_facility_id
        );
        
        -- Then delete from medical_coord_v_daily
        DELETE FROM "medical_coord_v_daily" WHERE "facility_id" = hq_facility_id;

        -- Finally delete the facility
        DELETE FROM "facilities" WHERE "id" = hq_facility_id;
    END IF;
END $$;
