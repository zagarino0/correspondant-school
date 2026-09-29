-- CreateEnum
CREATE TYPE "AttendanceEventType" AS ENUM ('LATE_AUTHORIZED', 'LATE_NOT_AUTHORIZED', 'ABSENCE_JUSTIFIED', 'ABSENCE_UNJUSTIFIED');

-- CreateEnum
CREATE TYPE "ParentSummonsStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED');

-- CreateTable
CREATE TABLE "AttendanceEvent" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "type" "AttendanceEventType" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentSummons" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ParentSummonsStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentSummons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceEvent_attendanceId_createdAt_idx" ON "AttendanceEvent"("attendanceId", "createdAt");
CREATE INDEX "AttendanceEvent_studentId_createdAt_idx" ON "AttendanceEvent"("studentId", "createdAt");
CREATE INDEX "AttendanceEvent_createdBy_createdAt_idx" ON "AttendanceEvent"("createdBy", "createdAt");
CREATE INDEX "AttendanceEvent_type_createdAt_idx" ON "AttendanceEvent"("type", "createdAt");

CREATE INDEX "ParentSummons_studentId_createdAt_idx" ON "ParentSummons"("studentId", "createdAt");
CREATE INDEX "ParentSummons_parentId_status_idx" ON "ParentSummons"("parentId", "status");
CREATE INDEX "ParentSummons_createdBy_createdAt_idx" ON "ParentSummons"("createdBy", "createdAt");
CREATE INDEX "ParentSummons_status_createdAt_idx" ON "ParentSummons"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ParentSummons" ADD CONSTRAINT "ParentSummons_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentSummons" ADD CONSTRAINT "ParentSummons_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentSummons" ADD CONSTRAINT "ParentSummons_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
