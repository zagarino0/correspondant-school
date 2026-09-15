import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  /*
   * École 1
   */
  const school = await prisma.school.findUnique({
    where: {
      id: "cmtxl4wbh0000s2r4xq278ajs",
    },
  });

  if (!school) {
    throw new Error("School 1 not found.");
  }

  /*
   * Teacher existant de l'école 1
   */
  const teacher = await prisma.user.findFirst({
    where: {
      id: "cmtxl4whe0006s2r4aje51959",
      role: "TEACHER",
      schoolId: school.id,
    },
  });

  if (!teacher) {
    throw new Error("Teacher of School 1 not found.");
  }

  /*
   * Étudiants existants
   */
  const studentA = await prisma.student.findUnique({
    where: {
      id: "cmty3kkm00007s2twzjm8ll58",
    },
  });

  const studentB = await prisma.student.findUnique({
    where: {
      id: "cmty3kkmb0009s2tw3ny2n2wj",
    },
  });

  if (!studentA || !studentB) {
    throw new Error("Student A or Student B not found.");
  }

  /*
   * Vérification : les étudiants doivent appartenir
   * à la même école.
   */
  if (
    studentA.schoolId !== school.id ||
    studentB.schoolId !== school.id
  ) {
    throw new Error(
      "Student A and Student B must belong to School 1."
    );
  }

  /*
   * Année scolaire 2026-2027
   */
  const academicYear = await prisma.academicYear.upsert({
    where: {
      schoolId_name: {
        schoolId: school.id,
        name: "2026-2027",
      },
    },
    update: {
      startDate: new Date("2026-09-01T00:00:00.000Z"),
      endDate: new Date("2027-07-31T23:59:59.999Z"),
      status: "ACTIVE",
    },
    create: {
      schoolId: school.id,
      name: "2026-2027",
      startDate: new Date("2026-09-01T00:00:00.000Z"),
      endDate: new Date("2027-07-31T23:59:59.999Z"),
      status: "ACTIVE",
    },
  });

  /*
   * Classe A
   */
  const classA = await prisma.schoolClass.upsert({
    where: {
      academicYearId_name: {
        academicYearId: academicYear.id,
        name: "Classe A",
      },
    },
    update: {
      level: "Test",
      schoolId: school.id,
    },
    create: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      name: "Classe A",
      level: "Test",
    },
  });

  /*
   * Classe B
   */
  const classB = await prisma.schoolClass.upsert({
    where: {
      academicYearId_name: {
        academicYearId: academicYear.id,
        name: "Classe B",
      },
    },
    update: {
      level: "Test",
      schoolId: school.id,
    },
    create: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      name: "Classe B",
      level: "Test",
    },
  });

  /*
   * Teacher → Classe A
   *
   * Le teacher n'est PAS affecté à la Classe B.
   */
  await prisma.teacherClass.upsert({
    where: {
      teacherId_classId: {
        teacherId: teacher.id,
        classId: classA.id,
      },
    },
    update: {},
    create: {
      teacherId: teacher.id,
      classId: classA.id,
    },
  });

  /*
   * Student A → Classe A
   */
  await prisma.studentEnrollment.upsert({
    where: {
      studentId_academicYearId: {
        studentId: studentA.id,
        academicYearId: academicYear.id,
      },
    },
    update: {
      classId: classA.id,
      status: "ACTIVE",
      endedAt: null,
    },
    create: {
      studentId: studentA.id,
      academicYearId: academicYear.id,
      classId: classA.id,
      status: "ACTIVE",
    },
  });

  /*
   * Student B → Classe B
   */
  await prisma.studentEnrollment.upsert({
    where: {
      studentId_academicYearId: {
        studentId: studentB.id,
        academicYearId: academicYear.id,
      },
    },
    update: {
      classId: classB.id,
      status: "ACTIVE",
      endedAt: null,
    },
    create: {
      studentId: studentB.id,
      academicYearId: academicYear.id,
      classId: classB.id,
      status: "ACTIVE",
    },
  });

  console.log("");
  console.log("Academic test data created successfully.");
  console.log("");

  console.table({
    school: school.name,
    academicYear: academicYear.name,
    teacher: `${teacher.firstName} ${teacher.lastName}`,
    teacherId: teacher.id,
    classA: classA.name,
    classAId: classA.id,
    classB: classB.name,
    classBId: classB.id,
    studentA: `${studentA.firstName} ${studentA.lastName}`,
    studentAId: studentA.id,
    studentB: `${studentB.firstName} ${studentB.lastName}`,
    studentBId: studentB.id,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });