-- Add created_by column to feedback_comments
ALTER TABLE "feedback_comments" ADD COLUMN "created_by" UUID REFERENCES "staffs"("id");

-- Update existing comments to link to a default admin staff if possible, or leave null for now
-- (This step is optional safely nullable for backward compatibility)
