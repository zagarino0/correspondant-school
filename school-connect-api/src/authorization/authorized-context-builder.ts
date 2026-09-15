import type { PrismaClient } from "@prisma/client";

import type { AuthorizedContext } from "./authorized-context.js";
import type { Role } from "./roles.js";

export interface AuthorizedIdentity {
  userId: string;
  role: Role;
  schoolId: string | null;
}

export async function buildAuthorizedContext(
  prisma: PrismaClient,
  identity: AuthorizedIdentity,
): Promise<AuthorizedContext> {
  const context: AuthorizedContext = {
    userId: identity.userId,
    role: identity.role,
    schoolId: identity.schoolId,
    childUserIds: [],
    assignedSchoolIds: [],
    assignedClassIds: [],
  };

  if (identity.role === "SCHOOL_ADMIN" && identity.schoolId !== null) {
    context.assignedSchoolIds = [identity.schoolId];
  }

  if (identity.role === "PARENT") {
    const relations = await prisma.parentStudent.findMany({
      where: {
        parentId: identity.userId,
      },
      select: {
        student: {
          select: {
            userId: true,
          },
        },
      },
    });

    context.childUserIds = relations.map(
      (relation) => relation.student.userId,
    );
  }

  if (identity.role === "TEACHER") {
    if (identity.schoolId === null) {
      return context;
    }

    const assignments = await prisma.teacherClass.findMany({
      where: {
        teacherId: identity.userId,
        class: {
          schoolId: identity.schoolId,
        },
      },
      select: {
        classId: true,
      },
    });

    context.assignedClassIds = assignments.map(
      (assignment) => assignment.classId,
    );
  }

  if (identity.role === "STAFF") {
    const staffProfile = await prisma.staffProfile.findUnique({
      where: {
        userId: identity.userId,
      },
      select: {
        assignments: {
          where: {
            active: true,
          },
          select: {
            schoolId: true,
          },
        },
      },
    });

    context.assignedSchoolIds =
      staffProfile?.assignments.map((assignment) => assignment.schoolId) ?? [];
  }

  return context;
}
