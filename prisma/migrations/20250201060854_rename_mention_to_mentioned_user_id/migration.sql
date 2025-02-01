/*
  Warnings:

  - You are about to drop the column `mention` on the `FeedComment` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "FeedComment" DROP CONSTRAINT "FeedComment_mention_fkey";

-- AlterTable
ALTER TABLE "FeedComment" DROP COLUMN "mention",
ADD COLUMN     "mentionedUserId" UUID;

-- AddForeignKey
ALTER TABLE "FeedComment" ADD CONSTRAINT "FeedComment_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
