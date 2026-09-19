-- CreateTable
CREATE TABLE "LessonObservation" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonObservation_scheduleId_date_key" ON "LessonObservation"("scheduleId", "date");

-- CreateIndex
CREATE INDEX "LessonObservation_teacherId_date_idx" ON "LessonObservation"("teacherId", "date");

-- CreateIndex
CREATE INDEX "LessonObservation_scheduleId_date_idx" ON "LessonObservation"("scheduleId", "date");

-- AddForeignKey
ALTER TABLE "LessonObservation" ADD CONSTRAINT "LessonObservation_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonObservation" ADD CONSTRAINT "LessonObservation_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
