import type { PrismaClient, UserRole } from "@prisma/client";

export async function canMessageUser(
  prisma: PrismaClient,
  senderId: string,
  recipientId: string,
): Promise<boolean> {
  if (senderId === recipientId) {
    return false;
  }

  const [sender, recipient] = await Promise.all([
    prisma.user.findUnique({
      where: { id: senderId },
      select: {
        id: true,
        role: true,
        schoolId: true,
        status: true,
        staffProfile: {
          select: {
            function: true,
            assignments: {
              where: { active: true },
              select: { schoolId: true },
            },
          },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: recipientId },
      select: {
        id: true,
        role: true,
        schoolId: true,
        status: true,
      },
    }),
  ]);

  if (!sender || !recipient) {
    return false;
  }

  if (sender.status !== "ACTIVE" || recipient.status !== "ACTIVE") {
    return false;
  }

  if (sender.role === "SUPER_ADMIN") {
    return recipient.role === "SCHOOL_ADMIN";
  }

  if (sender.role === "SCHOOL_ADMIN") {
    return sender.schoolId !== null && sender.schoolId === recipient.schoolId;
  }

  if (sender.role === "TEACHER") {
    if (sender.schoolId === null || sender.schoolId !== recipient.schoolId) {
      return false;
    }

    if (recipient.role === "SCHOOL_ADMIN" || recipient.role === "STAFF") {
      return true;
    }

    if (recipient.role === "STUDENT") {
      return canTeacherMessageStudent(prisma, senderId, recipientId);
    }

    if (recipient.role === "PARENT") {
      return canTeacherMessageParent(prisma, senderId, recipientId);
    }

    return false;
  }

  if (sender.role === "PARENT") {
    if (sender.schoolId === null || sender.schoolId !== recipient.schoolId) {
      return false;
    }

    if (recipient.role === "SCHOOL_ADMIN") {
      return true;
    }

    if (recipient.role === "TEACHER") {
      return canParentMessageTeacher(prisma, senderId, recipientId);
    }

    return false;
  }

  if (sender.role === "STUDENT") {
    if (sender.schoolId === null || sender.schoolId !== recipient.schoolId) {
      return false;
    }

    if (recipient.role === "SCHOOL_ADMIN") {
      return true;
    }

    if (recipient.role === "TEACHER") {
      return canStudentMessageTeacher(prisma, senderId, recipientId);
    }

    return false;
  }

  if (sender.role === "STAFF") {
    if (sender.schoolId === null || sender.schoolId !== recipient.schoolId) {
      return false;
    }

    if (recipient.role === "SCHOOL_ADMIN") {
      return true;
    }

    return false;
  }

  return false;
}

async function canTeacherMessageStudent(
  prisma: PrismaClient,
  teacherId: string,
  studentUserId: string,
): Promise<boolean> {
  const student = await prisma.student.findUnique({
    where: { userId: studentUserId },
    select: {
      enrollments: {
        where: { status: "ACTIVE" },
        select: { classId: true },
      },
    },
  });

  if (!student) {
    return false;
  }

  const classIds = await prisma.teacherClass.findMany({
    where: { teacherId },
    select: { classId: true },
  });

  const teacherClassIds = new Set(classIds.map((assignment) => assignment.classId));

  return student.enrollments.some((enrollment) =>
    teacherClassIds.has(enrollment.classId),
  );
}

async function canTeacherMessageParent(
  prisma: PrismaClient,
  teacherId: string,
  parentId: string,
): Promise<boolean> {
  const [teacherClasses, parentChildren] = await Promise.all([
    prisma.teacherClass.findMany({
      where: { teacherId },
      select: { classId: true },
    }),
    prisma.parentStudent.findMany({
      where: { parentId },
      select: {
        student: {
          select: {
            enrollments: {
              where: { status: "ACTIVE" },
              select: { classId: true },
            },
          },
        },
      },
    }),
  ]);

  const teacherClassIds = new Set(
    teacherClasses.map((assignment) => assignment.classId),
  );

  return parentChildren.some((link) =>
    link.student.enrollments.some((enrollment) =>
      teacherClassIds.has(enrollment.classId),
    ),
  );
}

async function canParentMessageTeacher(
  prisma: PrismaClient,
  parentId: string,
  teacherId: string,
): Promise<boolean> {
  const [parentChildren, teacherClasses] = await Promise.all([
    prisma.parentStudent.findMany({
      where: { parentId },
      select: {
        student: {
          select: {
            enrollments: {
              where: { status: "ACTIVE" },
              select: { classId: true },
            },
          },
        },
      },
    }),
    prisma.teacherClass.findMany({
      where: { teacherId },
      select: { classId: true },
    }),
  ]);

  const teacherClassIds = new Set(
    teacherClasses.map((assignment) => assignment.classId),
  );

  return parentChildren.some((link) =>
    link.student.enrollments.some((enrollment) =>
      teacherClassIds.has(enrollment.classId),
    ),
  );
}

async function canStudentMessageTeacher(
  prisma: PrismaClient,
  studentUserId: string,
  teacherId: string,
): Promise<boolean> {
  const student = await prisma.student.findUnique({
    where: { userId: studentUserId },
    select: {
      enrollments: {
        where: { status: "ACTIVE" },
        select: { classId: true },
      },
    },
  });

  if (!student) {
    return false;
  }

  const teacherClasses = await prisma.teacherClass.findMany({
    where: { teacherId },
    select: { classId: true },
  });

  const teacherClassIds = new Set(
    teacherClasses.map((assignment) => assignment.classId),
  );

  return student.enrollments.some((enrollment) =>
    teacherClassIds.has(enrollment.classId),
  );
}
