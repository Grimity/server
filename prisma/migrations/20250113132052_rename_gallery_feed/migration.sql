/*
  Warnings:

  - The primary key for the `Tag` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `galleryId` on the `Tag` table. All the data in the column will be lost.
  - You are about to drop the `Gallery` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `feedId` to the `Tag` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Gallery" DROP CONSTRAINT "Gallery_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_galleryId_fkey";

-- AlterTable
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_pkey",
DROP COLUMN "galleryId",
ADD COLUMN     "feedId" UUID NOT NULL,
ADD CONSTRAINT "Tag_pkey" PRIMARY KEY ("feedId", "tagName");

-- DropTable
DROP TABLE "Gallery";

-- CreateTable
CREATE TABLE "Feed" (
    "id" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "cards" TEXT[],
    "isAI" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Feed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feed_title_idx" ON "Feed"("title");

-- CreateIndex
CREATE INDEX "Feed_authorId_idx" ON "Feed"("authorId");

-- AddForeignKey
ALTER TABLE "Feed" ADD CONSTRAINT "Feed_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "Feed"("id") ON DELETE CASCADE ON UPDATE CASCADE;
