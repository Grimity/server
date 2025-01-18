/*
  Warnings:

  - The primary key for the `Notification` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_pkey",
ADD CONSTRAINT "Notification_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
