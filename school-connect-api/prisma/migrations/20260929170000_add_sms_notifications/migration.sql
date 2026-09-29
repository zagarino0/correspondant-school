-- AlterTable
ALTER TABLE "User"
ADD COLUMN "phone" TEXT,
ADD COLUMN "smsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateEnum
CREATE TYPE "SmsNotificationType" AS ENUM ('SUMMONS', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "SmsNotificationStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "SmsNotification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT,
    "studentId" TEXT,
    "parentSummonsId" TEXT,
    "announcementId" TEXT,
    "type" "SmsNotificationType" NOT NULL,
    "status" "SmsNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "providerMessageId" TEXT,
    "recipientPhone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsNotification_status_nextAttemptAt_idx"
ON "SmsNotification"("status", "nextAttemptAt");

CREATE INDEX "SmsNotification_recipientId_createdAt_idx"
ON "SmsNotification"("recipientId", "createdAt");

CREATE INDEX "SmsNotification_studentId_createdAt_idx"
ON "SmsNotification"("studentId", "createdAt");

CREATE INDEX "SmsNotification_parentSummonsId_idx"
ON "SmsNotification"("parentSummonsId");

CREATE INDEX "SmsNotification_announcementId_idx"
ON "SmsNotification"("announcementId");

-- AddForeignKey
ALTER TABLE "SmsNotification"
ADD CONSTRAINT "SmsNotification_recipientId_fkey"
FOREIGN KEY ("recipientId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SmsNotification"
ADD CONSTRAINT "SmsNotification_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SmsNotification"
ADD CONSTRAINT "SmsNotification_parentSummonsId_fkey"
FOREIGN KEY ("parentSummonsId") REFERENCES "ParentSummons"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SmsNotification"
ADD CONSTRAINT "SmsNotification_announcementId_fkey"
FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
