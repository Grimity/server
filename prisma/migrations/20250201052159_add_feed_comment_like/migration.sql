-- AlterTable
ALTER TABLE "FeedComment" ADD COLUMN     "likeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mention" UUID;

-- CreateTable
CREATE TABLE "FeedCommentLike" (
    "feedCommentId" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "FeedCommentLike_pkey" PRIMARY KEY ("feedCommentId","userId")
);

-- AddForeignKey
ALTER TABLE "FeedComment" ADD CONSTRAINT "FeedComment_mention_fkey" FOREIGN KEY ("mention") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedCommentLike" ADD CONSTRAINT "FeedCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedCommentLike" ADD CONSTRAINT "FeedCommentLike_feedCommentId_fkey" FOREIGN KEY ("feedCommentId") REFERENCES "FeedComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
