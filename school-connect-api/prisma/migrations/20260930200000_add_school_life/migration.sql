-- CreateEnum
CREATE TYPE "StudentExitType" AS ENUM ('TEMPORARY', 'PERMANENT');

-- CreateEnum
CREATE TYPE "StudentExitStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StudentMovementType" AS ENUM ('ENTRY', 'EXIT');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DisciplinaryActionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuthorizationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('NORMAL', 'IMPORTANT', 'CRITICAL');

-- CreateTable
CREATE TABLE "StudentExit" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "StudentExitType" NOT NULL DEFAULT 'TEMPORARY',
    "status" "StudentExitStatus" NOT NULL DEFAULT 'OPEN',
    "authorizedPersonName" TEXT NOT NULL,
    "authorizedPersonPhone" TEXT,
    "reason" TEXT NOT NULL,
    "exitAt" TIMESTAMP(3) NOT NULL,
    "returnAt" TIMESTAMP(3),
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentExit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentMovement" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "StudentMovementType" NOT NULL,
    "reason" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisciplinaryAction" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "incidentId" TEXT,
    "type" TEXT NOT NULL,
    "status" "DisciplinaryActionStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT NOT NULL,
    "actionAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisciplinaryAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolLifeObservation" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolLifeObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentAuthorization" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "AuthorizationStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT,
    "recipientId" TEXT,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReport" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "absences" INTEGER NOT NULL DEFAULT 0,
    "lates" INTEGER NOT NULL DEFAULT 0,
    "incidents" INTEGER NOT NULL DEFAULT 0,
    "exits" INTEGER NOT NULL DEFAULT 0,
    "movements" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentExit_schoolId_exitAt_idx" ON "StudentExit"("schoolId", "exitAt");
CREATE INDEX "StudentExit_studentId_exitAt_idx" ON "StudentExit"("studentId", "exitAt");
CREATE INDEX "StudentExit_status_idx" ON "StudentExit"("status");
CREATE INDEX "StudentExit_recordedBy_idx" ON "StudentExit"("recordedBy");

CREATE INDEX "StudentMovement_schoolId_occurredAt_idx" ON "StudentMovement"("schoolId", "occurredAt");
CREATE INDEX "StudentMovement_studentId_occurredAt_idx" ON "StudentMovement"("studentId", "occurredAt");
CREATE INDEX "StudentMovement_type_occurredAt_idx" ON "StudentMovement"("type", "occurredAt");
CREATE INDEX "StudentMovement_recordedBy_idx" ON "StudentMovement"("recordedBy");

CREATE INDEX "Incident_schoolId_occurredAt_idx" ON "Incident"("schoolId", "occurredAt");
CREATE INDEX "Incident_studentId_occurredAt_idx" ON "Incident"("studentId", "occurredAt");
CREATE INDEX "Incident_severity_occurredAt_idx" ON "Incident"("severity", "occurredAt");
CREATE INDEX "Incident_reportedBy_idx" ON "Incident"("reportedBy");

CREATE INDEX "DisciplinaryAction_schoolId_actionAt_idx" ON "DisciplinaryAction"("schoolId", "actionAt");
CREATE INDEX "DisciplinaryAction_studentId_actionAt_idx" ON "DisciplinaryAction"("studentId", "actionAt");
CREATE INDEX "DisciplinaryAction_incidentId_idx" ON "DisciplinaryAction"("incidentId");
CREATE INDEX "DisciplinaryAction_status_idx" ON "DisciplinaryAction"("status");
CREATE INDEX "DisciplinaryAction_createdBy_idx" ON "DisciplinaryAction"("createdBy");

CREATE INDEX "SchoolLifeObservation_schoolId_observedAt_idx" ON "SchoolLifeObservation"("schoolId", "observedAt");
CREATE INDEX "SchoolLifeObservation_studentId_observedAt_idx" ON "SchoolLifeObservation"("studentId", "observedAt");
CREATE INDEX "SchoolLifeObservation_createdBy_idx" ON "SchoolLifeObservation"("createdBy");

CREATE INDEX "ParentAuthorization_schoolId_status_idx" ON "ParentAuthorization"("schoolId", "status");
CREATE INDEX "ParentAuthorization_studentId_status_idx" ON "ParentAuthorization"("studentId", "status");
CREATE INDEX "ParentAuthorization_parentId_status_idx" ON "ParentAuthorization"("parentId", "status");
CREATE INDEX "ParentAuthorization_requestedAt_idx" ON "ParentAuthorization"("requestedAt");

CREATE INDEX "Alert_schoolId_createdAt_idx" ON "Alert"("schoolId", "createdAt");
CREATE INDEX "Alert_studentId_createdAt_idx" ON "Alert"("studentId", "createdAt");
CREATE INDEX "Alert_recipientId_readAt_idx" ON "Alert"("recipientId", "readAt");
CREATE INDEX "Alert_severity_createdAt_idx" ON "Alert"("severity", "createdAt");

CREATE UNIQUE INDEX "DailyReport_schoolId_reportDate_key" ON "DailyReport"("schoolId", "reportDate");
CREATE INDEX "DailyReport_schoolId_reportDate_idx" ON "DailyReport"("schoolId", "reportDate");
CREATE INDEX "DailyReport_createdBy_idx" ON "DailyReport"("createdBy");

-- AddForeignKey
ALTER TABLE "StudentExit" ADD CONSTRAINT "StudentExit_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentExit" ADD CONSTRAINT "StudentExit_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentExit" ADD CONSTRAINT "StudentExit_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentMovement" ADD CONSTRAINT "StudentMovement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentMovement" ADD CONSTRAINT "StudentMovement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentMovement" ADD CONSTRAINT "StudentMovement_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Incident" ADD CONSTRAINT "Incident_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reportedBy_fkey" FOREIGN KEY ("reportedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DisciplinaryAction" ADD CONSTRAINT "DisciplinaryAction_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DisciplinaryAction" ADD CONSTRAINT "DisciplinaryAction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DisciplinaryAction" ADD CONSTRAINT "DisciplinaryAction_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DisciplinaryAction" ADD CONSTRAINT "DisciplinaryAction_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchoolLifeObservation" ADD CONSTRAINT "SchoolLifeObservation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolLifeObservation" ADD CONSTRAINT "SchoolLifeObservation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolLifeObservation" ADD CONSTRAINT "SchoolLifeObservation_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ParentAuthorization" ADD CONSTRAINT "ParentAuthorization_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentAuthorization" ADD CONSTRAINT "ParentAuthorization_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentAuthorization" ADD CONSTRAINT "ParentAuthorization_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Alert" ADD CONSTRAINT "Alert_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
