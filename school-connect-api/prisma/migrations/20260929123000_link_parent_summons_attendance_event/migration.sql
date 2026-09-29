ALTER TABLE "ParentSummons"
ADD COLUMN "attendanceEventId" TEXT;

CREATE INDEX "ParentSummons_attendanceEventId_idx"
ON "ParentSummons"("attendanceEventId");

ALTER TABLE "ParentSummons"
ADD CONSTRAINT "ParentSummons_attendanceEventId_fkey"
FOREIGN KEY ("attendanceEventId") REFERENCES "AttendanceEvent"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
