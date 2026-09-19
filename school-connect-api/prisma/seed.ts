import { PrismaClient, UserRole, ScheduleDay, StudentEnrollmentStatus } from "@prisma/client";
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
    { email: "parent@school-connect.local", firstName: "Demo", lastName: "Parent", role: UserRole.PARENT, schoolId: school.id },
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
