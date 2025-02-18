/*
  Warnings:

  - You are about to drop the column `hasImage` on the `Post` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Post" DROP COLUMN "hasImage",
ADD COLUMN     "thumbnail" TEXT;
