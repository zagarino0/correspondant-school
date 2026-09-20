-- CreateTable
CREATE TABLE "MedicalEvent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MedicalEvent_schoolId_startAt_idx" ON "MedicalEvent"("schoolId", "startAt");
CREATE INDEX "MedicalEvent_targetUserId_startAt_idx" ON "MedicalEvent"("targetUserId", "startAt");
CREATE INDEX "MedicalEvent_createdByUserId_idx" ON "MedicalEvent"("createdByUserId");
CREATE INDEX "MedicalEvent_status_startAt_idx" ON "MedicalEvent"("status", "startAt");

ALTER TABLE "MedicalEvent" ADD CONSTRAINT "MedicalEvent_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MedicalEvent" ADD CONSTRAINT "MedicalEvent_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MedicalEvent" ADD CONSTRAINT "MedicalEvent_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
