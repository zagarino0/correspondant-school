DO $$
BEGIN
  CREATE TYPE "StudentGender" AS ENUM ('MALE', 'FEMALE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "gender" "StudentGender";
