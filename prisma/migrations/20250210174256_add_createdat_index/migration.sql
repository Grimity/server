-- DropIndex
DROP INDEX "Feed_authorId_idx";

-- DropIndex
DROP INDEX "Notification_userId_idx";

-- DropIndex
DROP INDEX "Post_authorId_idx";

-- CreateIndex
CREATE INDEX "Feed_authorId_createdAt_idx" ON "Feed"("authorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Like_feedId_idx" ON "Like"("feedId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Post_authorId_createdAt_idx" ON "Post"("authorId", "createdAt" DESC);
