ALTER TABLE "Project" ADD COLUMN "accessToken" TEXT;
UPDATE "Project"
SET "accessToken" = md5(random()::text || clock_timestamp()::text || "id")
WHERE "accessToken" IS NULL;
ALTER TABLE "Project" ALTER COLUMN "accessToken" SET NOT NULL;
CREATE UNIQUE INDEX "Project_accessToken_key" ON "Project"("accessToken");
