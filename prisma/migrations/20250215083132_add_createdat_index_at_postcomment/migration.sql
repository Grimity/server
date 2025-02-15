-- DropIndex
DROP INDEX "PostComment_postId_idx";

-- CreateIndex
CREATE INDEX "PostComment_postId_createdAt_idx" ON "PostComment"("postId", "createdAt" ASC);
