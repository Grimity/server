-- CreateTable
CREATE TABLE "Report" (
    "id" UUID NOT NULL,
    "type" SMALLINT NOT NULL,
    "userId" UUID NOT NULL,
    "refType" TEXT NOT NULL,
    "refId" UUID NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);
