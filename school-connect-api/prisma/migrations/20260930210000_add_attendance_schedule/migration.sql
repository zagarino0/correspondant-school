-- Link attendance records to timetable sessions without rewriting legacy records.
ALTER TABLE "Attendance"
ADD COLUMN "scheduleId" TEXT,
ADD COLUMN "sessionKey" TEXT;

DROP INDEX IF EXISTS "Attendance_enrollmentId_date_key";

CREATE UNIQUE INDEX "Attendance_sessionKey_key"
ON "Attendance"("sessionKey");

CREATE INDEX "Attendance_scheduleId_date_idx"
ON "Attendance"("scheduleId", "date");

ALTER TABLE "Attendance"
ADD CONSTRAINT "Attendance_scheduleId_fkey"
FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
