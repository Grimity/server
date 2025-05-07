-- This is an empty migration.
DROP INDEX "User_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name" text_pattern_ops);