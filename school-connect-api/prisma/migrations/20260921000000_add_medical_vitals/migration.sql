ALTER TABLE "StudentMedicalRecord"
  ADD COLUMN "temperature" DOUBLE PRECISION,
  ADD COLUMN "weightKg" DOUBLE PRECISION,
  ADD COLUMN "bloodPressureSystolic" INTEGER,
  ADD COLUMN "bloodPressureDiastolic" INTEGER;

ALTER TABLE "AdultMedicalRecord"
  ADD COLUMN "temperature" DOUBLE PRECISION,
  ADD COLUMN "weightKg" DOUBLE PRECISION,
  ADD COLUMN "bloodPressureSystolic" INTEGER,
  ADD COLUMN "bloodPressureDiastolic" INTEGER;
