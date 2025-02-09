-- DropForeignKey
ALTER TABLE "PostComment" DROP CONSTRAINT "PostComment_writerId_fkey";

-- AlterTable
ALTER TABLE "PostComment" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "writerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_writerId_fkey" FOREIGN KEY ("writerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
