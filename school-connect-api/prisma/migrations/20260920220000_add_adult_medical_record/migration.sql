-- CreateTable
CREATE TABLE "AdultMedicalRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bloodGroup" TEXT,
    "allergies" TEXT,
    "medicalConditions" TEXT,
    "medications" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "doctorName" TEXT,
    "doctorPhone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdultMedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdultMedicalRecord_userId_key" ON "AdultMedicalRecord"("userId");

-- CreateIndex
CREATE INDEX "AdultMedicalRecord_userId_idx" ON "AdultMedicalRecord"("userId");

-- AddForeignKey
ALTER TABLE "AdultMedicalRecord" ADD CONSTRAINT "AdultMedicalRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
