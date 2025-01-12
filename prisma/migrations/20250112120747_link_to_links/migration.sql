/*
  Warnings:

  - You are about to drop the column `link` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "link",
ADD COLUMN     "links" TEXT[];
