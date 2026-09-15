import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const studentA = await prisma.student.findUnique({
    where: {
      id: "cmty3kkm00007s2twzjm8ll58",
    },
    include: {
      enrollments: {
        where: {
          academicYear: {
            name: "2026-2027",
          },
        },
      },
    },
  });

  const studentB = await prisma.student.findUnique({
    where: {
      id: "cmty3kkmb0009s2tw3ny2n2wj",
    },
    include: {
      enrollments: {
        where: {
          academicYear: {
            name: "2026-2027",
          },
        },
      },
    },
  });

  const recorder = await prisma.user.findUnique({
    where: {
      email: "teacher@school-connect.local",
    },
  });

  if (!studentA || !studentB) {
    throw new Error("Student A ou Student B introuvable.");
  }

  if (!recorder) {
    throw new Error("Utilisateur teacher introuvable.");
  }

  const enrollmentA = studentA.enrollments[0];
  const enrollmentB = studentB.enrollments[0];

  if (!enrollmentA || !enrollmentB) {
    throw new Error("Enrollment 2026-2027 introuvable.");
  }

  const attendanceData = [
    {
      studentId: studentA.id,
      enrollmentId: enrollmentA.id,
      date: new Date("2026-09-14T00:00:00.000Z"),
      status: "PRESENT" as const,
      arrivalTime: null,
      reason: null,
      note: "Présence normale.",
      recordedBy: recorder.id,
    },
    {
      studentId: studentA.id,
      enrollmentId: enrollmentA.id,
      date: new Date("2026-09-15T00:00:00.000Z"),
      status: "LATE" as const,
      arrivalTime: new Date("2026-09-15T05:37:00.000Z"),
      reason: "Retard au transport.",
      note: "Arrivée après le début des cours.",
      recordedBy: recorder.id,
    },
    {
      studentId: studentB.id,
      enrollmentId: enrollmentB.id,
      date: new Date("2026-09-14T00:00:00.000Z"),
      status: "ABSENT" as const,
      arrivalTime: null,
      reason: null,
      note: "Absence constatée.",
      recordedBy: recorder.id,
    },
    {
      studentId: studentB.id,
      enrollmentId: enrollmentB.id,
      date: new Date("2026-09-15T00:00:00.000Z"),
      status: "EXCUSED" as const,
      arrivalTime: null,
      reason: "Rendez-vous médical.",
      note: "Absence justifiée.",
      recordedBy: recorder.id,
    },
  ];

  for (const data of attendanceData) {
    await prisma.attendance.upsert({
      where: {
        enrollmentId_date: {
          enrollmentId: data.enrollmentId,
          date: data.date,
        },
      },
      update: {
        status: data.status,
        arrivalTime: data.arrivalTime,
        reason: data.reason,
        note: data.note,
        recordedBy: data.recordedBy,
      },
      create: data,
    });
  }

  const attendances = await prisma.attendance.findMany({
    where: {
      enrollmentId: {
        in: [enrollmentA.id, enrollmentB.id],
      },
    },
    include: {
      student: {
        select: {
          id: true,
          studentNumber: true,
          firstName: true,
          lastName: true,
        },
      },
      enrollment: {
        select: {
          id: true,
          academicYear: {
            select: {
              name: true,
            },
          },
          class: {
            select: {
              name: true,
            },
          },
        },
      },
      recorder: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: [
      {
        date: "asc",
      },
      {
        studentId: "asc",
      },
    ],
  });

  console.log("\n=== ATTENDANCES DE TEST ===\n");

  for (const attendance of attendances) {
    console.log({
      id: attendance.id,
      student: `${attendance.student.firstName} ${attendance.student.lastName}`,
      studentNumber: attendance.student.studentNumber,
      date: attendance.date.toISOString(),
      status: attendance.status,
      arrivalTime: attendance.arrivalTime?.toISOString() ?? null,
      reason: attendance.reason,
      note: attendance.note,
      academicYear: attendance.enrollment.academicYear.name,
      class: attendance.enrollment.class.name,
      recordedBy: attendance.recorder.email,
      recorderRole: attendance.recorder.role,
    });
  }

  console.log(`\nTotal présences : ${attendances.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });