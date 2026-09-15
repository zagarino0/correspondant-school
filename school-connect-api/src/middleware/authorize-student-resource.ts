import type { FastifyRequest } from "fastify";

import type { Permission } from "../authorization/permissions.js";
import { authorizeResource } from "./authorize-resource.js";
import { canParentAccessStudent } from "../authorization/parent-access.js";

export function authorizeStudentResource(
  permission: Permission
) {
  return authorizeResource(
    permission,
    async (request: FastifyRequest) => {
      const studentIdFromParams =
  request.params &&
  typeof request.params === "object" &&
  "studentId" in request.params
    ? (request.params as { studentId?: string }).studentId
    : undefined;

const studentIdFromBody =
  request.body &&
  typeof request.body === "object" &&
  "studentId" in request.body
    ? (request.body as { studentId?: string }).studentId
    : undefined;

const studentId =
  studentIdFromParams ?? studentIdFromBody ?? null;

      if (!studentId) {
        return false;
      }

      const role = request.user.role;

      /*
       * SUPER_ADMIN
       *
       * Accès global à tous les étudiants.
       */
      if (role === "SUPER_ADMIN") {
        return true;
      }

      /*
       * SCHOOL_ADMIN
       *
       * Accès uniquement aux étudiants
       * de sa propre école.
       */
      if (role === "SCHOOL_ADMIN") {
        if (!request.user.schoolId) {
          return false;
        }

        const student = await request.server.prisma.student.findUnique({
          where: {
            id: studentId,
          },
          select: {
            schoolId: true,
          },
        });

        return (
          student !== null &&
          student.schoolId === request.user.schoolId
        );
      }

      /*
       * PARENT
       *
       * Accès uniquement à ses propres enfants.
       */
      if (role === "PARENT") {
        return canParentAccessStudent(
          request.server.prisma,
          request.user.sub,
          studentId
        );
      }

      /*
       * STUDENT
       *
       * Accès uniquement à son propre profil.
       */
      if (role === "STUDENT") {
        const student = await request.server.prisma.student.findUnique({
          where: {
            id: studentId,
          },
          select: {
            userId: true,
          },
        });

        return student?.userId === request.user.sub;
      }

      /*
       * TEACHER
       *
       * Accès uniquement aux étudiants :
       *
       * Teacher
       *   ↓
       * TeacherClass
       *   ↓
       * SchoolClass
       *   ↓
       * AcademicYear ACTIVE
       *   ↓
       * StudentEnrollment ACTIVE
       *   ↓
       * Student
       *
       * Le teacher doit également appartenir
       * à la même école que l'étudiant.
       */
      if (role === "TEACHER") {
        if (!request.user.schoolId) {
          return false;
        }

        const access = await request.server.prisma.studentEnrollment.findFirst({
          where: {
            studentId,

            status: "ACTIVE",

            student: {
              schoolId: request.user.schoolId,
            },

            academicYear: {
              status: "ACTIVE",
              schoolId: request.user.schoolId,
            },

            class: {
              schoolId: request.user.schoolId,

              teacherAssignments: {
                some: {
                  teacherId: request.user.sub,
                },
              },
            },
          },

          select: {
            id: true,
          },
        });

        return access !== null;
      }

      /*
 * STAFF
 *
 * Le Staff est autorisé selon son affectation
 * active à une école.
 *
 * Pour le SURVEILLANT :
 *
 * Staff
 *   ↓
 * StaffProfile
 *   ↓
 * StaffAssignment ACTIVE
 *   ↓
 * School
 *   ↓
 * Student
 *
 * Le surveillant peut consulter les étudiants
 * de son école uniquement.
 */
if (role === "STAFF") {
  const staffProfile =
    await request.server.prisma.staffProfile.findUnique({
      where: {
        userId: request.user.sub,
      },
      select: {
        function: true,
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

  if (!staffProfile) {
    return false;
  }

  if (staffProfile.assignments.length === 0) {
    return false;
  }

  const student = await request.server.prisma.student.findUnique({
    where: { id: studentId },
    select: {
      schoolId: true,
    },
  });

  if (!student) {
    return false;
  }

  return staffProfile.assignments.some(
    (assignment) => assignment.schoolId === student.schoolId
  );
}
      return false;
    }
  );
}