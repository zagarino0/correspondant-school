import type { FastifyPluginAsync } from "fastify";

import { authenticate } from "../middleware/authenticate.js";

export const parentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/parents/me/children",
    {
      onRequest: [authenticate],
    },
    async (request, reply) => {
      if (request.user.role !== "PARENT") {
        return reply.status(403).send({
          error: {
            code: "FORBIDDEN",
            message: "Parent access required.",
          },
        });
      }

      const children = await fastify.prisma.parentStudent.findMany({
        where: {
          parentId: request.user.sub,
          student: {
            status: "ACTIVE",
          },
        },
        orderBy: [
          { isPrimary: "desc" },
          { student: { lastName: "asc" } },
          { student: { firstName: "asc" } },
        ],
        select: {
          id: true,
          relationship: true,
          isPrimary: true,
          student: {
            select: {
              id: true,
              studentNumber: true,
              firstName: true,
              lastName: true,
              status: true,
              enrollments: {
                where: {
                  status: "ACTIVE",
                  academicYear: {
                    status: "ACTIVE",
                  },
                },
                orderBy: {
                  enrolledAt: "desc",
                },
                take: 1,
                select: {
                  id: true,
                  status: true,
                  class: {
                    select: {
                      id: true,
                      name: true,
                      level: true,
                    },
                  },
                  academicYear: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return reply.send({
        children: children.map((link) => ({
          id: link.student.id,
          studentNumber: link.student.studentNumber,
          firstName: link.student.firstName,
          lastName: link.student.lastName,
          status: link.student.status,
          relationship: link.relationship,
          isPrimary: link.isPrimary,
          enrollment: link.student.enrollments[0] ?? null,
        })),
      });
    },
  );

  fastify.get(
    "/parents/me/children/:studentId/schedule",
    {
      onRequest: [authenticate],
    },
    async (request, reply) => {
      if (request.user.role !== "PARENT") {
        return reply.status(403).send({
          error: {
            code: "FORBIDDEN",
            message: "Parent access required.",
          },
        });
      }

      const { studentId } = request.params as {
        studentId: string;
      };

      const parentStudent = await fastify.prisma.parentStudent.findFirst({
        where: {
          parentId: request.user.sub,
          studentId,
          student: {
            status: "ACTIVE",
          },
        },
        select: {
          student: {
            select: {
              id: true,
              studentNumber: true,
              firstName: true,
              lastName: true,
              enrollments: {
                where: {
                  status: "ACTIVE",
                  academicYear: {
                    status: "ACTIVE",
                  },
                },
                orderBy: {
                  enrolledAt: "desc",
                },
                take: 1,
                select: {
                  id: true,
                  academicYearId: true,
                  classId: true,
                  class: {
                    select: {
                      id: true,
                      name: true,
                      level: true,
                    },
                  },
                  academicYear: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!parentStudent) {
        return reply.status(404).send({
          error: {
            code: "CHILD_NOT_FOUND",
            message: "Child not found for this parent.",
          },
        });
      }

      const student = parentStudent.student;
      const enrollment = student.enrollments[0];

      if (!enrollment) {
        return reply.status(404).send({
          error: {
            code: "ACTIVE_ENROLLMENT_NOT_FOUND",
            message: "No active enrollment found.",
          },
        });
      }

      const schedules = await fastify.prisma.schedule.findMany({
        where: {
          classId: enrollment.classId,
          academicYearId: enrollment.academicYearId,
          ...(request.user.schoolId
            ? { schoolId: request.user.schoolId }
            : {}),
        },
        orderBy: [
          { dayOfWeek: "asc" },
          { startTime: "asc" },
          { endTime: "asc" },
        ],
        select: {
          id: true,
          schoolId: true,
          academicYearId: true,
          classId: true,
          teacherId: true,
          subject: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          room: true,
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return reply.send({
        student: {
          id: student.id,
          studentNumber: student.studentNumber,
          firstName: student.firstName,
          lastName: student.lastName,
        },
        enrollment: {
          id: enrollment.id,
          academicYear: enrollment.academicYear,
          class: enrollment.class,
        },
        schedules,
      });
    },
  );

  fastify.get(
    "/parents/me/children/:studentId/medical-record",
    {
      onRequest: [authenticate],
    },
    async (request, reply) => {
      if (request.user.role !== "PARENT") {
        return reply.status(403).send({
          error: {
            code: "FORBIDDEN",
            message: "Parent access required.",
          },
        });
      }

      const { studentId } = request.params as { studentId: string };

      const parentStudent = await fastify.prisma.parentStudent.findFirst({
        where: {
          parentId: request.user.sub,
          studentId,
          student: { status: "ACTIVE" },
        },
        select: {
          student: {
            select: {
              id: true,
              studentNumber: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              medicalRecord: {
                select: {
                  id: true,
                  bloodGroup: true,
                  allergies: true,
                  medicalConditions: true,
                  medications: true,
                  emergencyContactName: true,
                  emergencyContactPhone: true,
                  doctorName: true,
                  doctorPhone: true,
                  notes: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
      });

      if (!parentStudent) {
        return reply.status(404).send({
          error: {
            code: "CHILD_NOT_FOUND",
            message: "Child not found for this parent.",
          },
        });
      }

      return reply.send({
        student: parentStudent.student,
        medicalRecord: parentStudent.student.medicalRecord,
      });
    },
  );

};
