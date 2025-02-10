/*
  Warnings:

  - You are about to drop the column `actorId` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `actorName` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `feedId` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Notification` table. All the data in the column will be lost.
  - Added the required column `data` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "actorId",
DROP COLUMN "actorName",
DROP COLUMN "feedId",
DROP COLUMN "type",
ADD COLUMN     "data" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "subscription" TEXT[] DEFAULT ARRAY['FOLLOW', 'FEED_LIKE', 'FEED_COMMENT', 'FEED_ANSWER', 'POST_COMMENT', 'POST_ANSWER']::TEXT[];
