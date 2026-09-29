import { PrismaClient, UserRole, ScheduleDay, StudentEnrollmentStatus, StaffFunction } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "Password123!";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const school = await prisma.school.upsert({
    where: { code: "SC-DEMO" },
    update: { name: "Demo School Connect", status: "ACTIVE" },
    create: { code: "SC-DEMO", name: "Demo School Connect", status: "ACTIVE" },
  });

  const users = [
    { email: "superadmin@school-connect.local", firstName: "Super", lastName: "Admin", role: UserRole.SUPER_ADMIN, schoolId: null },
    { email: "admin@school-connect.local", firstName: "School", lastName: "Admin", role: UserRole.SCHOOL_ADMIN, schoolId: school.id },
    { email: "teacher@school-connect.local", firstName: "Demo", lastName: "Teacher", role: UserRole.TEACHER, schoolId: school.id },
    { email: "parent@school-connect.local", firstName: "Demo", lastName: "Parent", role: UserRole.PARENT, schoolId: school.id, phone: "0376520982", smsEnabled: true },
    { email: "parent2@school-connect.local", firstName: "Marie", lastName: "Rakoto", role: UserRole.PARENT, schoolId: school.id },
    { email: "parent3@school-connect.local", firstName: "Paul", lastName: "Andria", role: UserRole.PARENT, schoolId: school.id },
    { email: "parent4@school-connect.local", firstName: "Sophie", lastName: "Rabe", role: UserRole.PARENT, schoolId: school.id },
    { email: "staff@school-connect.local", firstName: "Demo", lastName: "Staff", role: UserRole.STAFF, schoolId: school.id },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        schoolId: user.schoolId,
        status: "ACTIVE",
        passwordHash,
      },
      create: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        schoolId: user.schoolId,
        status: "ACTIVE",
        passwordHash,
      },
    });
  }

  const teacher = await prisma.user.findUniqueOrThrow({
    where: { email: "teacher@school-connect.local" },
  });

  const staff = await prisma.user.findUniqueOrThrow({
    where: { email: "staff@school-connect.local" },
  });

  const staffProfile = await prisma.staffProfile.upsert({
    where: { userId: staff.id },
    update: { function: StaffFunction.SURVEILLANT },
    create: {
      userId: staff.id,
      function: StaffFunction.SURVEILLANT,
    },
  });

  await prisma.staffAssignment.upsert({
    where: {
      staffId_schoolId_startDate: {
        staffId: staffProfile.id,
        schoolId: school.id,
        startDate: new Date("2026-09-01T00:00:00.000Z"),
      },
    },
    update: {
      active: true,
      endDate: null,
    },
    create: {
      staffId: staffProfile.id,
      schoolId: school.id,
      startDate: new Date("2026-09-01T00:00:00.000Z"),
      endDate: null,
      active: true,
    },
  });

  const academicYear = await prisma.academicYear.upsert({
    where: {
      schoolId_name: {
        schoolId: school.id,
        name: "2026-2027",
      },
    },
    update: {
      startDate: new Date("2026-09-01T00:00:00.000Z"),
      endDate: new Date("2027-06-30T23:59:59.000Z"),
      status: "ACTIVE",
    },
    create: {
      schoolId: school.id,
      name: "2026-2027",
      startDate: new Date("2026-09-01T00:00:00.000Z"),
      endDate: new Date("2027-06-30T23:59:59.000Z"),
      status: "ACTIVE",
    },
  });

  const classes = await Promise.all(
    [
      { name: "Classe A", level: "6e" },
      { name: "Classe B", level: "5e" },
      { name: "Classe C", level: "4e" },
    ].map((item) =>
      prisma.schoolClass.upsert({
        where: {
          academicYearId_name: {
            academicYearId: academicYear.id,
            name: item.name,
          },
        },
        update: { level: item.level, schoolId: school.id },
        create: {
          schoolId: school.id,
          academicYearId: academicYear.id,
          name: item.name,
          level: item.level,
        },
      }),
    ),
  );

  for (const schoolClass of classes) {
    await prisma.teacherClass.upsert({
      where: {
        teacherId_classId: {
          teacherId: teacher.id,
          classId: schoolClass.id,
        },
      },
      update: {},
      create: {
        teacherId: teacher.id,
        classId: schoolClass.id,
      },
    });
  }

  const students = [
    { email: "student.a1@school-connect.local", firstName: "Jean", lastName: "Rakoto", number: "A001", classIndex: 0 },
    { email: "student.a2@school-connect.local", firstName: "Mia", lastName: "Andria", number: "A002", classIndex: 0 },
    { email: "student.b1@school-connect.local", firstName: "Lucas", lastName: "Rabe", number: "B001", classIndex: 1 },
    { email: "student.b2@school-connect.local", firstName: "Sara", lastName: "Rasoana", number: "B002", classIndex: 1 },
    { email: "student.c1@school-connect.local", firstName: "Noah", lastName: "Ranaivo", number: "C001", classIndex: 2 },
    { email: "student.c2@school-connect.local", firstName: "Lina", lastName: "Rakotomalala", number: "C002", classIndex: 2 },
  ];

  for (const item of students) {
    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: {
        firstName: item.firstName,
        lastName: item.lastName,
        role: UserRole.STUDENT,
        schoolId: school.id,
        status: "ACTIVE",
        passwordHash,
      },
      create: {
        email: item.email,
        firstName: item.firstName,
        lastName: item.lastName,
        role: UserRole.STUDENT,
        schoolId: school.id,
        status: "ACTIVE",
        passwordHash,
      },
    });

    const student = await prisma.student.upsert({
      where: { userId: user.id },
      update: {
        schoolId: school.id,
        studentNumber: item.number,
        firstName: item.firstName,
        lastName: item.lastName,
        status: "ACTIVE",
      },
      create: {
        schoolId: school.id,
        userId: user.id,
        studentNumber: item.number,
        firstName: item.firstName,
        lastName: item.lastName,
        status: "ACTIVE",
      },
    });

    const schoolClass = classes[item.classIndex];

    await prisma.studentEnrollment.upsert({
      where: {
        studentId_academicYearId: {
          studentId: student.id,
          academicYearId: academicYear.id,
        },
      },
      update: {
        classId: schoolClass.id,
        status: StudentEnrollmentStatus.ACTIVE,
        endedAt: null,
      },
      create: {
        studentId: student.id,
        academicYearId: academicYear.id,
        classId: schoolClass.id,
        status: StudentEnrollmentStatus.ACTIVE,
      },
    });
  }

  const parentLinks = [
    { parentEmail: "parent@school-connect.local", studentNumber: "A001", relationship: "Père", isPrimary: true },
    { parentEmail: "parent@school-connect.local", studentNumber: "A002", relationship: "Père", isPrimary: false },
    { parentEmail: "parent2@school-connect.local", studentNumber: "B001", relationship: "Mère", isPrimary: true },
    { parentEmail: "parent3@school-connect.local", studentNumber: "B002", relationship: "Père", isPrimary: true },
    { parentEmail: "parent3@school-connect.local", studentNumber: "C001", relationship: "Père", isPrimary: false },
    { parentEmail: "parent4@school-connect.local", studentNumber: "C002", relationship: "Mère", isPrimary: true },
  ];

  for (const link of parentLinks) {
    const parent = await prisma.user.findUniqueOrThrow({
      where: { email: link.parentEmail },
    });

    const student = await prisma.student.findFirstOrThrow({
      where: {
        schoolId: school.id,
        studentNumber: link.studentNumber,
      },
    });

    await prisma.parentStudent.upsert({
      where: {
        parentId_studentId: {
          parentId: parent.id,
          studentId: student.id,
        },
      },
      update: {
        relationship: link.relationship,
        isPrimary: link.isPrimary,
      },
      create: {
        parentId: parent.id,
        studentId: student.id,
        relationship: link.relationship,
        isPrimary: link.isPrimary,
      },
    });
  }

  const gradeData = [
    { studentNumber: "A001", subject: "Mathématiques", title: "Contrôle fractions", value: 14, coefficient: 1, comment: "Bon travail." },
    { studentNumber: "A001", subject: "Français", title: "Analyse de texte", value: 16, coefficient: 2, comment: "Très bonne compréhension." },
    { studentNumber: "A001", subject: "Sciences", title: "Évaluation énergie", value: 12, coefficient: 1, comment: null },
    { studentNumber: "A002", subject: "Mathématiques", title: "Contrôle fractions", value: 11, coefficient: 1, comment: "À renforcer." },
    { studentNumber: "A002", subject: "Français", title: "Analyse de texte", value: 13, coefficient: 2, comment: null },
    { studentNumber: "A002", subject: "Sciences", title: "Évaluation énergie", value: 15, coefficient: 1, comment: "Bonne participation." },
    { studentNumber: "B001", subject: "Mathématiques", title: "Contrôle fractions", value: 15, coefficient: 1, comment: "Bon niveau." },
    { studentNumber: "B001", subject: "Français", title: "Expression écrite", value: 12, coefficient: 2, comment: null },
    { studentNumber: "B001", subject: "Sciences", title: "Évaluation énergie", value: 14, coefficient: 1, comment: null },
    { studentNumber: "B002", subject: "Mathématiques", title: "Contrôle fractions", value: 9, coefficient: 1, comment: "Doit progresser." },
    { studentNumber: "B002", subject: "Français", title: "Expression écrite", value: 14, coefficient: 2, comment: "Bonne rédaction." },
    { studentNumber: "B002", subject: "Sciences", title: "Évaluation énergie", value: 13, coefficient: 1, comment: null },
    { studentNumber: "C001", subject: "Mathématiques", title: "Contrôle fractions", value: 16, coefficient: 1, comment: "Très bon travail." },
    { studentNumber: "C001", subject: "Français", title: "Expression écrite", value: 15, coefficient: 2, comment: null },
    { studentNumber: "C001", subject: "Sciences", title: "Évaluation énergie", value: 17, coefficient: 1, comment: "Excellent." },
    { studentNumber: "C002", subject: "Mathématiques", title: "Contrôle fractions", value: 10, coefficient: 1, comment: null },
    { studentNumber: "C002", subject: "Français", title: "Expression écrite", value: 12, coefficient: 2, comment: "Peut mieux faire." },
    { studentNumber: "C002", subject: "Sciences", title: "Évaluation énergie", value: 14, coefficient: 1, comment: null },
  ];

  for (const item of gradeData) {
    const student = await prisma.student.findFirstOrThrow({
      where: {
        schoolId: school.id,
        studentNumber: item.studentNumber,
      },
      include: {
        enrollments: {
          where: {
            academicYearId: academicYear.id,
            status: StudentEnrollmentStatus.ACTIVE,
          },
          take: 1,
        },
      },
    });

    const enrollment = student.enrollments[0];

    if (!enrollment) {
      throw new Error(`Active enrollment missing for ${item.studentNumber}`);
    }

    const existing = await prisma.grade.findFirst({
      where: {
        studentId: student.id,
        enrollmentId: enrollment.id,
        subject: item.subject,
        title: item.title,
      },
    });

    if (existing) {
      await prisma.grade.update({
        where: { id: existing.id },
        data: {
          value: item.value,
          maxValue: 20,
          coefficient: item.coefficient,
          evaluationDate: new Date("2026-09-18T00:00:00.000Z"),
          comment: item.comment,
          recordedBy: teacher.id,
        },
      });
    } else {
      await prisma.grade.create({
        data: {
          studentId: student.id,
          enrollmentId: enrollment.id,
          subject: item.subject,
          title: item.title,
          value: item.value,
          maxValue: 20,
          coefficient: item.coefficient,
          evaluationDate: new Date("2026-09-18T00:00:00.000Z"),
          comment: item.comment,
          recordedBy: teacher.id,
        },
      });
    }
  }

  const assignmentData = [
    { classIndex: 0, subject: "Mathématiques", title: "Exercices sur les fractions", description: "Réviser les opérations sur les fractions et résoudre les exercices 1 à 10.", dueDate: "2026-09-20T23:59:59.999Z" },
    { classIndex: 0, subject: "Français", title: "Analyse de texte", description: "Lire le texte fourni et répondre aux questions.", dueDate: "2026-09-22T23:59:59.999Z" },
    { classIndex: 1, subject: "Mathématiques", title: "Problèmes de calcul", description: "Résoudre les problèmes distribués en classe.", dueDate: "2026-09-21T23:59:59.999Z" },
    { classIndex: 1, subject: "Français", title: "Expression écrite", description: "Rédiger un texte de 20 lignes sur un sujet donné.", dueDate: "2026-09-23T23:59:59.999Z" },
    { classIndex: 2, subject: "Mathématiques", title: "Révision calcul", description: "Réviser les notions étudiées cette semaine.", dueDate: "2026-09-24T23:59:59.999Z" },
    { classIndex: 2, subject: "Sciences", title: "Énergie et matière", description: "Répondre aux questions du chapitre étudié.", dueDate: "2026-09-25T23:59:59.999Z" },
  ];

  for (const item of assignmentData) {
    const schoolClass = classes[item.classIndex];

    const existing = await prisma.assignment.findFirst({
      where: {
        classId: schoolClass.id,
        subject: item.subject,
        title: item.title,
      },
    });

    const data = {
      classId: schoolClass.id,
      studentId: null,
      subject: item.subject,
      title: item.title,
      description: item.description,
      assignedAt: new Date("2026-09-18T08:00:00.000Z"),
      dueDate: new Date(item.dueDate),
      status: "PENDING" as const,
      createdBy: teacher.id,
    };

    if (existing) {
      await prisma.assignment.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.assignment.create({ data });
    }
  }

  const weeklySchedules = [
    { classIndex: 0, subject: "Mathématiques", dayOfWeek: ScheduleDay.MONDAY, startTime: "08:00", endTime: "09:00", room: "Salle A1" },
    { classIndex: 0, subject: "Français", dayOfWeek: ScheduleDay.WEDNESDAY, startTime: "09:15", endTime: "10:15", room: "Salle A1" },
    { classIndex: 0, subject: "Sciences", dayOfWeek: ScheduleDay.FRIDAY, startTime: "10:30", endTime: "11:30", room: "Laboratoire" },
    { classIndex: 1, subject: "Français", dayOfWeek: ScheduleDay.MONDAY, startTime: "09:15", endTime: "10:15", room: "Salle B1" },
    { classIndex: 1, subject: "Mathématiques", dayOfWeek: ScheduleDay.TUESDAY, startTime: "08:00", endTime: "09:00", room: "Salle B1" },
    { classIndex: 1, subject: "Sciences", dayOfWeek: ScheduleDay.THURSDAY, startTime: "10:30", endTime: "11:30", room: "Laboratoire" },
    { classIndex: 2, subject: "Sciences", dayOfWeek: ScheduleDay.MONDAY, startTime: "10:30", endTime: "11:30", room: "Laboratoire" },
    { classIndex: 2, subject: "Mathématiques", dayOfWeek: ScheduleDay.WEDNESDAY, startTime: "08:00", endTime: "09:00", room: "Salle C1" },
    { classIndex: 2, subject: "Français", dayOfWeek: ScheduleDay.FRIDAY, startTime: "09:15", endTime: "10:15", room: "Salle C1" },
  ];

  for (const item of weeklySchedules) {
    const schoolClass = classes[item.classIndex];

    const existing = await prisma.schedule.findFirst({
      where: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        classId: schoolClass.id,
        teacherId: teacher.id,
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
        endTime: item.endTime,
      },
    });

    if (existing) {
      await prisma.schedule.update({
        where: { id: existing.id },
        data: {
          subject: item.subject,
          room: item.room,
        },
      });
    } else {
      await prisma.schedule.create({
        data: {
          schoolId: school.id,
          academicYearId: academicYear.id,
          classId: schoolClass.id,
          teacherId: teacher.id,
          subject: item.subject,
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          room: item.room,
        },
      });
    }
  }

  const saturdaySchedules = [
    { classIndex: 0, subject: "Mathématiques", startTime: "09:00", endTime: "10:00", room: "Salle A1" },
    { classIndex: 1, subject: "Français", startTime: "10:15", endTime: "11:15", room: "Salle B1" },
    { classIndex: 2, subject: "Sciences", startTime: "11:30", endTime: "12:30", room: "Salle C1" },
  ];

  for (const item of saturdaySchedules) {
    const schoolClass = classes[item.classIndex];

    const existing = await prisma.schedule.findFirst({
      where: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        classId: schoolClass.id,
        teacherId: teacher.id,
        subject: item.subject,
        dayOfWeek: ScheduleDay.SATURDAY,
        startTime: item.startTime,
        endTime: item.endTime,
      },
    });

    if (existing) {
      await prisma.schedule.update({
        where: { id: existing.id },
        data: { room: item.room },
      });
    } else {
      await prisma.schedule.create({
        data: {
          schoolId: school.id,
          academicYearId: academicYear.id,
          classId: schoolClass.id,
          teacherId: teacher.id,
          subject: item.subject,
          dayOfWeek: ScheduleDay.SATURDAY,
          startTime: item.startTime,
          endTime: item.endTime,
          room: item.room,
        },
      });
    }
  }

  console.log("Seed completed successfully.");
  console.log("School: SC-DEMO - Demo School Connect");
  console.log("Teacher: teacher@school-connect.local");
  console.log("Parents: parent@school-connect.local (2 enfants), parent2@school-connect.local (1 enfant), parent3@school-connect.local (2 enfants), parent4@school-connect.local (1 enfant)");
  console.log("Today's test timetable: Saturday / Classe A, B, C");
  console.log(`Development password: ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
