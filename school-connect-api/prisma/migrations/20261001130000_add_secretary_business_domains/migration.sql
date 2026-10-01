-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('RECORDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "Document" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT,
  "fileUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Meeting" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "studentId" TEXT,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "receivedBy" TEXT NOT NULL,
  "studentId" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MGA',
  "method" TEXT NOT NULL,
  "reference" TEXT,
  "description" TEXT,
  "status" "PaymentStatus" NOT NULL DEFAULT 'RECORDED',
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Ticket" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "assignedTo" TEXT,
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
  "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Document_schoolId_idx" ON "Document"("schoolId");
CREATE INDEX "Document_createdBy_idx" ON "Document"("createdBy");
CREATE INDEX "Meeting_schoolId_scheduledAt_idx" ON "Meeting"("schoolId", "scheduledAt");
CREATE INDEX "Meeting_studentId_idx" ON "Meeting"("studentId");
CREATE INDEX "Meeting_createdBy_idx" ON "Meeting"("createdBy");
CREATE INDEX "Payment_schoolId_paidAt_idx" ON "Payment"("schoolId", "paidAt");
CREATE INDEX "Payment_studentId_idx" ON "Payment"("studentId");
CREATE INDEX "Payment_receivedBy_idx" ON "Payment"("receivedBy");
CREATE INDEX "Ticket_schoolId_status_idx" ON "Ticket"("schoolId", "status");
CREATE INDEX "Ticket_createdBy_idx" ON "Ticket"("createdBy");
CREATE INDEX "Ticket_assignedTo_idx" ON "Ticket"("assignedTo");

ALTER TABLE "Document"
  ADD CONSTRAINT "Document_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Document"
  ADD CONSTRAINT "Document_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON UPDATE CASCADE;

ALTER TABLE "Meeting"
  ADD CONSTRAINT "Meeting_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Meeting"
  ADD CONSTRAINT "Meeting_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON UPDATE CASCADE;

ALTER TABLE "Meeting"
  ADD CONSTRAINT "Meeting_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_receivedBy_fkey"
  FOREIGN KEY ("receivedBy") REFERENCES "User"("id") ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON UPDATE CASCADE;

ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_assignedTo_fkey"
  FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
