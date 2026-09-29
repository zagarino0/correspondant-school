-- AlterTable
ALTER TABLE "ParentSummons" ADD COLUMN "responseReadAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ParentSummons_createdBy_status_responseReadAt_idx"
ON "ParentSummons"("createdBy", "status", "responseReadAt");
