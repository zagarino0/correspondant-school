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
};
