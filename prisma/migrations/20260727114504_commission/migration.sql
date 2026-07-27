-- CreateEnum
CREATE TYPE "ChatMessageType" AS ENUM ('USER', 'COMMISSION_REQUESTED', 'COMMISSION_ACCEPTED', 'COMMISSION_REJECTED', 'COMMISSION_CANCELED', 'COMMISSION_RESULT_UPLOADED', 'COMMISSION_FINAL_UPLOADED', 'COMMISSION_COMPLETED');

-- CreateEnum
CREATE TYPE "CommissionWorkStatus" AS ENUM ('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'FINAL', 'COMPLETED', 'REJECTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "CommissionReviewRating" AS ENUM ('SATISFIED', 'NORMAL', 'DISSATISFIED');

-- CreateEnum
CREATE TYPE "CommissionWorkEventType" AS ENUM ('REQUESTED', 'ACCEPTED', 'REJECTED', 'CANCELED', 'RESULT_UPLOADED', 'FINAL_UPLOADED', 'COMPLETED');

-- DropIndex
DROP INDEX "public"."Feed_title_trgm_idx";

-- DropIndex
DROP INDEX "public"."Post_title_trgm_idx";

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "referenceId" UUID,
ADD COLUMN     "type" "ChatMessageType" NOT NULL DEFAULT 'USER',
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "IdentityVerification" (
    "userId" UUID NOT NULL,
    "identityVerificationId" TEXT NOT NULL,
    "ci" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "gender" TEXT NOT NULL,
    "isForeigner" BOOLEAN NOT NULL,
    "pgProvider" TEXT NOT NULL,
    "pgTxId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityVerification_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "CommissionNotice" (
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionNotice_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "additionalCondition" TEXT,
    "price" INTEGER NOT NULL,
    "workDays" SMALLINT NOT NULL,
    "revisionCount" SMALLINT NOT NULL,
    "images" TEXT[],
    "thumbnail" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionTag" (
    "commissionId" UUID NOT NULL,
    "tagName" TEXT NOT NULL,

    CONSTRAINT "CommissionTag_pkey" PRIMARY KEY ("commissionId","tagName")
);

-- CreateTable
CREATE TABLE "CommissionQuestion" (
    "commissionId" UUID NOT NULL,
    "order" SMALLINT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT[],

    CONSTRAINT "CommissionQuestion_pkey" PRIMARY KEY ("commissionId","order")
);

-- CreateTable
CREATE TABLE "CommissionWork" (
    "id" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "commissionId" UUID,
    "status" "CommissionWorkStatus" NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionReview" (
    "id" UUID NOT NULL,
    "workId" UUID NOT NULL,
    "reviewerId" UUID NOT NULL,
    "revieweeId" UUID NOT NULL,
    "rating" "CommissionReviewRating" NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionWorkEvent" (
    "id" UUID NOT NULL,
    "workId" UUID NOT NULL,
    "type" "CommissionWorkEventType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionWorkEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionWorkMemo" (
    "id" UUID NOT NULL,
    "workId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionWorkMemo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRequest" (
    "workId" UUID NOT NULL,
    "answers" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "referenceImages" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionRequest_pkey" PRIMARY KEY ("workId")
);

-- CreateTable
CREATE TABLE "CommissionWorkResult" (
    "workId" UUID NOT NULL,
    "images" TEXT[],
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionWorkResult_pkey" PRIMARY KEY ("workId")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdentityVerification_identityVerificationId_key" ON "IdentityVerification"("identityVerificationId");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityVerification_ci_key" ON "IdentityVerification"("ci");

-- CreateIndex
CREATE INDEX "Commission_authorId_createdAt_idx" ON "Commission"("authorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Commission_createdAt_idx" ON "Commission"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "CommissionTag_tagName_idx" ON "CommissionTag"("tagName");

-- CreateIndex
CREATE INDEX "CommissionWork_authorId_createdAt_idx" ON "CommissionWork"("authorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CommissionWork_clientId_createdAt_idx" ON "CommissionWork"("clientId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CommissionReview_revieweeId_createdAt_idx" ON "CommissionReview"("revieweeId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "CommissionReview_workId_reviewerId_key" ON "CommissionReview"("workId", "reviewerId");

-- CreateIndex
CREATE INDEX "CommissionWorkEvent_workId_createdAt_idx" ON "CommissionWorkEvent"("workId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CommissionWorkMemo_workId_createdAt_idx" ON "CommissionWorkMemo"("workId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionNotice" ADD CONSTRAINT "CommissionNotice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionTag" ADD CONSTRAINT "CommissionTag_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "Commission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionQuestion" ADD CONSTRAINT "CommissionQuestion_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "Commission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionWork" ADD CONSTRAINT "CommissionWork_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionWork" ADD CONSTRAINT "CommissionWork_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionWork" ADD CONSTRAINT "CommissionWork_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "Commission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionReview" ADD CONSTRAINT "CommissionReview_workId_fkey" FOREIGN KEY ("workId") REFERENCES "CommissionWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionReview" ADD CONSTRAINT "CommissionReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionReview" ADD CONSTRAINT "CommissionReview_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionWorkEvent" ADD CONSTRAINT "CommissionWorkEvent_workId_fkey" FOREIGN KEY ("workId") REFERENCES "CommissionWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionWorkMemo" ADD CONSTRAINT "CommissionWorkMemo_workId_fkey" FOREIGN KEY ("workId") REFERENCES "CommissionWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRequest" ADD CONSTRAINT "CommissionRequest_workId_fkey" FOREIGN KEY ("workId") REFERENCES "CommissionWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionWorkResult" ADD CONSTRAINT "CommissionWorkResult_workId_fkey" FOREIGN KEY ("workId") REFERENCES "CommissionWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
