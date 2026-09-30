-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "previewUrl" TEXT,
ADD COLUMN     "scheduleRequestId" TEXT;

-- CreateTable
CREATE TABLE "EmailScheduleRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailScheduleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailScheduleRequest_campaignId_idx" ON "EmailScheduleRequest"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailScheduleRequest_userId_idempotencyKey_key" ON "EmailScheduleRequest"("userId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_scheduleRequestId_fkey" FOREIGN KEY ("scheduleRequestId") REFERENCES "EmailScheduleRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailScheduleRequest" ADD CONSTRAINT "EmailScheduleRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailScheduleRequest" ADD CONSTRAINT "EmailScheduleRequest_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "EmailCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
