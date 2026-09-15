import { PrismaClient, AssignmentStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const teacherId = "cmtxl4whe0006s2r4aje51959";
  const classId = "cmtygiqko0003s2l0zjiyipmf";
  const studentAId = "cmty3kkm00007s2twzjm8ll58";

  const assignments = await prisma.assignment.createMany({
    data: [
      {
        classId,
        studentId: null,
        subject: "Mathématiques",
        title: "Exercices sur les fractions",
        description: "Réviser les opérations sur les fractions et résoudre les exercices 1 à 10.",
        assignedAt: new Date("2026-09-13T08:00:00.000Z"),
        dueDate: new Date("2026-09-20T23:59:59.999Z"),
        status: AssignmentStatus.PENDING,
        createdBy: teacherId,
      },
      {
        classId,
        studentId: null,
        subject: "Français",
        title: "Analyse de texte",
        description: "Lire le texte fourni et répondre aux questions.",
        assignedAt: new Date("2026-09-12T08:00:00.000Z"),
        dueDate: new Date("2026-09-18T23:59:59.999Z"),
        status: AssignmentStatus.COMPLETED,
        createdBy: teacherId,
      },
      {
        classId,
        studentId: studentAId,
        subject: "Physique",
        title: "Exercices sur la vitesse",
        description: "Résoudre les problèmes de vitesse et de distance.",
        assignedAt: new Date("2026-09-10T08:00:00.000Z"),
        dueDate: new Date("2026-09-15T23:59:59.999Z"),
        status: AssignmentStatus.LATE,
        createdBy: teacherId,
      },
      {
        classId,
        studentId: studentAId,
        subject: "Anglais",
        title: "Reading comprehension",
        description: "Read the text and answer the comprehension questions.",
        assignedAt: new Date("2026-09-13T08:00:00.000Z"),
        dueDate: new Date("2026-09-22T23:59:59.999Z"),
        status: AssignmentStatus.SUBMITTED,
        createdBy: teacherId,
      },
    ],
  });

  console.log(`Created assignments: ${assignments.count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });