CREATE TABLE "MedicalHistory" (
    "id" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MedicalHistory_targetUserId_createdAt_idx" ON "MedicalHistory"("targetUserId", "createdAt");
CREATE INDEX "MedicalHistory_actorUserId_createdAt_idx" ON "MedicalHistory"("actorUserId", "createdAt");

ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
