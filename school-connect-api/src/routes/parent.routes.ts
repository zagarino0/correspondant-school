import { z } from "zod";
import type { FastifyPluginAsync } from "fastify";

import { authenticate } from "../middleware/authenticate.js";
import { publishToUser } from "../realtime/message-events.js";

export const parentRoutes: FastifyPluginAsync = async (fastify) => {

  fastify.get(
    "/parents/me/summons",
    { onRequest: [authenticate] },
    async (request, reply) => {
      if (request.user.role !== "PARENT") {
        return reply.status(403).send({
          error: { code: "FORBIDDEN", message: "Parent access required." },
        });
      }

      const summons = await fastify.prisma.parentSummons.findMany({
        where: { parentId: request.user.sub },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          studentId: true,
          attendanceEventId: true,
          reason: true,
          message: true,
          status: true,
          scheduledAt: true,
          createdAt: true,
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      return reply.send({ summons });
    },
  );

  
  fastify.patch(
    "/parents/me/summons/:summonsId",
    { onRequest: [authenticate] },
    async (request, reply) => {
      if (request.user.role !== "PARENT") {
        return reply.status(403).send({
          error: { code: "FORBIDDEN", message: "Parent access required." },
        });
      }

      const { summonsId } = request.params as { summonsId: string };
      const parsed = z.object({
        status: z.enum(["ACCEPTED", "DECLINED"]),
      }).safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "Invalid summons status." },
        });
      }

      const summons = await fastify.prisma.parentSummons.updateMany({
        where: {
          id: summonsId,
          parentId: request.user.sub,
          status: "PENDING",
        },
        data: { status: parsed.data.status, responseReadAt: null },
      });

      if (summons.count === 0) {
        return reply.status(404).send({
          error: { code: "SUMMONS_NOT_FOUND", message: "Pending summons not found." },
        });
      }

      const updatedSummons = await fastify.prisma.parentSummons.findUnique({
        where: { id: summonsId },
        select: {
          id: true,
          studentId: true,
          parentId: true,
          createdBy: true,
          reason: true,
          message: true,
          status: true,
          scheduledAt: true,
          createdAt: true,
          updatedAt: true,
          student: {
            select: { firstName: true, lastName: true },
          },
        },
      });

      if (updatedSummons) {
        publishToUser(updatedSummons.createdBy, "parent:summons:updated", {
          id: updatedSummons.id,
          studentId: updatedSummons.studentId,
          student: updatedSummons.student,
          status: updatedSummons.status,
          reason: updatedSummons.reason,
          message: updatedSummons.message,
          scheduledAt: updatedSummons.scheduledAt,
          createdAt: updatedSummons.createdAt,
          updatedAt: updatedSummons.updatedAt,
        });
      }

      return reply.send({ status: parsed.data.status });
    },
  );

  fastify.get(
    "/parents/me/authorizations",
    { onRequest: [authenticate] },
    async (request, reply) => {
      if (request.user.role !== "PARENT") {
        return reply.status(403).send({
          error: { code: "FORBIDDEN", message: "Parent access required." },
        });
      }

      const authorizations = await fastify.prisma.parentAuthorization.findMany({
        where: { parentId: request.user.sub },
        orderBy: { requestedAt: "desc" },
        take: 100,
        select: {
          id: true,
          schoolId: true,
          studentId: true,
          parentId: true,
          type: true,
          status: true,
          reason: true,
          requestedAt: true,
          decidedAt: true,
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentNumber: true,
            },
          },
        },
      });

      return reply.send({ authorizations });
    },
  );

  fastify.post(
    "/parents/me/authorizations",
    { onRequest: [authenticate] },
    async (request, reply) => {
      if (request.user.role !== "PARENT") {
        return reply.status(403).send({
          error: { code: "FORBIDDEN", message: "Parent access required." },
        });
      }

      const parsed = z.object({
        studentId: z.string().min(1),
        type: z.string().trim().min(2).max(100),
        reason: z.string().trim().min(1).max(1000),
      }).safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "studentId, type et reason sont requis.",
          },
        });
      }

      const parentStudent = await fastify.prisma.parentStudent.findFirst({
        where: {
          parentId: request.user.sub,
          studentId: parsed.data.studentId,
          student: { status: "ACTIVE" },
        },
        select: {
          student: {
            select: {
              id: true,
              schoolId: true,
              firstName: true,
              lastName: true,
              studentNumber: true,
            },
          },
        },
      });

      if (!parentStudent) {
        return reply.status(404).send({
          error: {
            code: "CHILD_NOT_FOUND",
            message: "Cet élève n'est pas associé à ce compte parent.",
          },
        });
      }

      const authorization = await fastify.prisma.parentAuthorization.create({
        data: {
          schoolId: parentStudent.student.schoolId,
          studentId: parentStudent.student.id,
          parentId: request.user.sub,
          type: parsed.data.type,
          reason: parsed.data.reason,
        },
        select: {
          id: true,
          schoolId: true,
          studentId: true,
          parentId: true,
          type: true,
          status: true,
          reason: true,
          requestedAt: true,
          decidedAt: true,
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentNumber: true,
            },
          },
        },
      });

      return reply.status(201).send({ authorization });
    },
  );

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
