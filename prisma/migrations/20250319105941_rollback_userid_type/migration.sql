/*
 Warnings:
 
 - The `mentionedUserId` column on the `FeedComment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
 - The primary key for the `FeedCommentLike` table will be changed. If it partially fails, the table could be left without primary key constraint.
 - The primary key for the `Follow` table will be changed. If it partially fails, the table could be left without primary key constraint.
 - The primary key for the `Like` table will be changed. If it partially fails, the table could be left without primary key constraint.
 - The `writerId` column on the `PostComment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
 - The `mentionedUserId` column on the `PostComment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
 - The primary key for the `PostCommentLike` table will be changed. If it partially fails, the table could be left without primary key constraint.
 - The primary key for the `PostLike` table will be changed. If it partially fails, the table could be left without primary key constraint.
 - The primary key for the `PostSave` table will be changed. If it partially fails, the table could be left without primary key constraint.
 - The primary key for the `RefreshToken` table will be changed. If it partially fails, the table could be left without primary key constraint.
 - The primary key for the `Save` table will be changed. If it partially fails, the table could be left without primary key constraint.
 - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
 - The primary key for the `View` table will be changed. If it partially fails, the table could be left without primary key constraint.
 - Changed the type of `authorId` on the `Feed` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
 - Changed the type of `writerId` on the `FeedComment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
 - Changed the type of `userId` on the `FeedCommentLike` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
 - Changed the type of `followerId` on the `Follow` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
 - Changed the type of `followingId` on the `Follow` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
 - Changed the type of `userId` on the `Like` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
 - Changed the type of `userId` on the `Notification` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
 - Changed the type of `authorId` on the `Post` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
 - Changed the type of `userId` on the `PostCommentLike` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
 - Changed the type of `userId` on the `PostLike` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
 - Changed the type of `userId` on the `PostSave` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
 - Changed the type of `userId` on the `RefreshToken` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
 - Changed the type of `userId` on the `Report` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
 - Changed the type of `userId` on the `Save` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
 - Changed the type of `id` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
 - Changed the type of `userId` on the `View` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
 
 */
-- DropForeignKey
ALTER TABLE
  "Feed" DROP CONSTRAINT "Feed_authorId_fkey";

-- DropForeignKey
ALTER TABLE
  "FeedComment" DROP CONSTRAINT "FeedComment_mentionedUserId_fkey";

-- DropForeignKey
ALTER TABLE
  "FeedComment" DROP CONSTRAINT "FeedComment_writerId_fkey";

-- DropForeignKey
ALTER TABLE
  "FeedCommentLike" DROP CONSTRAINT "FeedCommentLike_userId_fkey";

-- DropForeignKey
ALTER TABLE
  "Follow" DROP CONSTRAINT "Follow_followerId_fkey";

-- DropForeignKey
ALTER TABLE
  "Follow" DROP CONSTRAINT "Follow_followingId_fkey";

-- DropForeignKey
ALTER TABLE
  "Like" DROP CONSTRAINT "Like_userId_fkey";

-- DropForeignKey
ALTER TABLE
  "Post" DROP CONSTRAINT "Post_authorId_fkey";

-- DropForeignKey
ALTER TABLE
  "PostComment" DROP CONSTRAINT "PostComment_mentionedUserId_fkey";

-- DropForeignKey
ALTER TABLE
  "PostComment" DROP CONSTRAINT "PostComment_writerId_fkey";

-- DropForeignKey
ALTER TABLE
  "PostCommentLike" DROP CONSTRAINT "PostCommentLike_userId_fkey";

-- DropForeignKey
ALTER TABLE
  "PostLike" DROP CONSTRAINT "PostLike_userId_fkey";

-- DropForeignKey
ALTER TABLE
  "PostSave" DROP CONSTRAINT "PostSave_userId_fkey";

-- DropForeignKey
ALTER TABLE
  "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- DropForeignKey
ALTER TABLE
  "Save" DROP CONSTRAINT "Save_userId_fkey";

-- DropForeignKey
ALTER TABLE
  "View" DROP CONSTRAINT "View_userId_fkey";

-- AlterTable
ALTER TABLE
  "Feed"
ALTER COLUMN
  "authorId" TYPE UUID USING "authorId" :: UUID;

-- AlterTable
ALTER TABLE
  "FeedComment"
ALTER COLUMN
  "writerId" TYPE UUID USING "writerId" :: UUID;

ALTER TABLE
  "FeedComment"
ALTER COLUMN
  "mentionedUserId" TYPE UUID USING "mentionedUserId" :: UUID;

-- AlterTable
ALTER TABLE
  "FeedCommentLike" DROP CONSTRAINT "FeedCommentLike_pkey",
ALTER COLUMN
  "userId" TYPE UUID USING "userId" :: UUID,
ADD
  CONSTRAINT "FeedCommentLike_pkey" PRIMARY KEY ("feedCommentId", "userId");

-- AlterTable
ALTER TABLE
  "Follow" DROP CONSTRAINT "Follow_pkey",
ALTER COLUMN
  "followerId" TYPE UUID USING "followerId" :: UUID,
ALTER COLUMN
  "followingId" TYPE UUID USING "followingId" :: UUID,
ADD
  CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId", "followingId");

-- AlterTable
ALTER TABLE
  "Like" DROP CONSTRAINT "Like_pkey",
ALTER COLUMN
  "userId" TYPE UUID USING "userId" :: UUID,
ADD
  CONSTRAINT "Like_pkey" PRIMARY KEY ("userId", "feedId");

-- AlterTable
ALTER TABLE
  "Notification" DROP COLUMN "userId",
ADD
  COLUMN "userId" UUID NOT NULL;

-- AlterTable
ALTER TABLE
  "Post"
ALTER COLUMN
  "authorId" TYPE UUID USING "authorId" :: UUID;

-- AlterTable
ALTER TABLE
  "PostComment"
ALTER COLUMN
  "writerId" TYPE UUID USING "writerId" :: UUID,
ALTER COLUMN
  "mentionedUserId" TYPE UUID USING "mentionedUserId" :: UUID;

-- AlterTable
ALTER TABLE
  "PostCommentLike" DROP CONSTRAINT "PostCommentLike_pkey",
ALTER COLUMN
  "userId" TYPE UUID USING "userId" :: UUID,
ADD
  CONSTRAINT "PostCommentLike_pkey" PRIMARY KEY ("postCommentId", "userId");

-- AlterTable
ALTER TABLE
  "PostLike" DROP CONSTRAINT "PostLike_pkey",
ALTER COLUMN
  "userId" TYPE UUID USING "userId" :: UUID,
ADD
  CONSTRAINT "PostLike_pkey" PRIMARY KEY ("postId", "userId");

-- AlterTable
ALTER TABLE
  "PostSave" DROP CONSTRAINT "PostSave_pkey",
  DROP COLUMN "userId",
ADD
  COLUMN "userId" UUID NOT NULL,
ADD
  CONSTRAINT "PostSave_pkey" PRIMARY KEY ("userId", "postId");

-- AlterTable
ALTER TABLE
  "RefreshToken" DROP CONSTRAINT "RefreshToken_pkey",
ALTER COLUMN
  "userId" TYPE UUID USING "userId" :: UUID,
ADD
  CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("userId", "token");

-- AlterTable
ALTER TABLE
  "Report" DROP COLUMN "userId",
ADD
  COLUMN "userId" UUID NOT NULL;

-- AlterTable
ALTER TABLE
  "Save" DROP CONSTRAINT "Save_pkey",
  DROP COLUMN "userId",
ADD
  COLUMN "userId" UUID NOT NULL,
ADD
  CONSTRAINT "Save_pkey" PRIMARY KEY ("userId", "feedId");

-- AlterTable
ALTER TABLE
  "User"
ALTER COLUMN
  "id" TYPE UUID USING "id" :: UUID;

-- AlterTable
ALTER TABLE
  "View" DROP CONSTRAINT "View_pkey",
  DROP COLUMN "userId",
ADD
  COLUMN "userId" UUID NOT NULL,
ADD
  CONSTRAINT "View_pkey" PRIMARY KEY ("userId", "feedId");

-- CreateIndex
DROP INDEX IF EXISTS "Feed_authorId_createdAt_idx";

CREATE INDEX "Feed_authorId_createdAt_idx" ON "Feed"("authorId", "createdAt" DESC);

-- CreateIndex
DROP INDEX IF EXISTS "Follow_followingId_idx";

CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
DROP INDEX IF EXISTS "Notification_userId_createdAt_idx";

CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);

-- CreateIndex
DROP INDEX IF EXISTS "Post_authorId_createdAt_idx";

CREATE INDEX "Post_authorId_createdAt_idx" ON "Post"("authorId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE
  "Follow"
ADD
  CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "Follow"
ADD
  CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "Feed"
ADD
  CONSTRAINT "Feed_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "Like"
ADD
  CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "View"
ADD
  CONSTRAINT "View_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "Save"
ADD
  CONSTRAINT "Save_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "FeedComment"
ADD
  CONSTRAINT "FeedComment_writerId_fkey" FOREIGN KEY ("writerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "FeedComment"
ADD
  CONSTRAINT "FeedComment_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "User"("id") ON DELETE
SET
  NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "FeedCommentLike"
ADD
  CONSTRAINT "FeedCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "Post"
ADD
  CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "PostLike"
ADD
  CONSTRAINT "PostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "PostSave"
ADD
  CONSTRAINT "PostSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "PostComment"
ADD
  CONSTRAINT "PostComment_writerId_fkey" FOREIGN KEY ("writerId") REFERENCES "User"("id") ON DELETE
SET
  NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "PostComment"
ADD
  CONSTRAINT "PostComment_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "User"("id") ON DELETE
SET
  NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "PostCommentLike"
ADD
  CONSTRAINT "PostCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "RefreshToken"
ADD
  CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;