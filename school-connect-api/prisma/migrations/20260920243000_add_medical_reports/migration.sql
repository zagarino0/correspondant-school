CREATE TABLE "MedicalReport" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "targetUserId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "reportDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "reason" TEXT,
  "observations" TEXT,
  "actionsTaken" TEXT,
  "outcome" TEXT,
  "recommendations" TEXT,
  "parentContacted" BOOLEAN NOT NULL DEFAULT false,
  "parentContactedAt" TIMESTAMP(3),
  "referredTo" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MedicalReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MedicalReport_schoolId_reportDate_idx" ON "MedicalReport"("schoolId", "reportDate");
CREATE INDEX "MedicalReport_targetUserId_reportDate_idx" ON "MedicalReport"("targetUserId", "reportDate");
CREATE INDEX "MedicalReport_createdByUserId_idx" ON "MedicalReport"("createdByUserId");
CREATE INDEX "MedicalReport_status_reportDate_idx" ON "MedicalReport"("status", "reportDate");

ALTER TABLE "MedicalReport"
  ADD CONSTRAINT "MedicalReport_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MedicalReport"
  ADD CONSTRAINT "MedicalReport_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MedicalReport"
  ADD CONSTRAINT "MedicalReport_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
