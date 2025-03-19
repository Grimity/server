/*
 Warnings:
 
 - You are about to drop the column `tempId` on the `User` table. All the data in the column will be lost.
 - Added the required column `url` to the `User` table without a default value. This is not possible if the table is not empty.
 
 */
-- AlterTable
ALTER TABLE
  "User" RENAME COLUMN "tempId" TO "url";

ALTER TABLE
  "User"
ALTER COLUMN
  "url"
SET
  NOT NULL;