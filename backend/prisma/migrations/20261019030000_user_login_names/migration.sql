ALTER TABLE "User" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_username_normalized_key" ON "User"(lower("username")) WHERE "username" IS NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_username_format" CHECK ("username" IS NULL OR "username" ~ '^[A-Za-z0-9_]{3,32}$');
