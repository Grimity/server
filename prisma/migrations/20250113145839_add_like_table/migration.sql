-- DropIndex
DROP INDEX "Feed_title_idx";

-- CreateTable
CREATE TABLE "Like" (
    "userId" UUID NOT NULL,
    "feedId" UUID NOT NULL,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("userId","feedId")
);

-- CreateIndex
CREATE INDEX "Feed_createdAt_idx" ON "Feed"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "Feed"("id") ON DELETE CASCADE ON UPDATE CASCADE;
