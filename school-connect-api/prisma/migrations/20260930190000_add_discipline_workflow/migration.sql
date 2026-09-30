-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DisciplinaryApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Incident"
  ADD COLUMN "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "location" TEXT,
  ADD COLUMN "resolutionNote" TEXT,
  ADD COLUMN "resolvedAt" TIMESTAMP(3),
  ADD COLUMN "resolvedBy" TEXT;

-- AlterTable
ALTER TABLE "DisciplinaryAction"
  ADD COLUMN "approvalStatus" "DisciplinaryApprovalStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "decisionNote" TEXT,
  ADD COLUMN "dueAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "approvedBy" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "completedBy" TEXT;

-- CreateIndex
CREATE INDEX "Incident_status_occurredAt_idx" ON "Incident"("status", "occurredAt");
CREATE INDEX "Incident_resolvedBy_idx" ON "Incident"("resolvedBy");
CREATE INDEX "DisciplinaryAction_approvalStatus_idx" ON "DisciplinaryAction"("approvalStatus");
CREATE INDEX "DisciplinaryAction_approvedBy_idx" ON "DisciplinaryAction"("approvedBy");
CREATE INDEX "DisciplinaryAction_completedBy_idx" ON "DisciplinaryAction"("completedBy");

-- AddForeignKey
ALTER TABLE "Incident"
  ADD CONSTRAINT "Incident_resolvedBy_fkey"
  FOREIGN KEY ("resolvedBy") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DisciplinaryAction"
  ADD CONSTRAINT "DisciplinaryAction_approvedBy_fkey"
  FOREIGN KEY ("approvedBy") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DisciplinaryAction"
  ADD CONSTRAINT "DisciplinaryAction_completedBy_fkey"
  FOREIGN KEY ("completedBy") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
