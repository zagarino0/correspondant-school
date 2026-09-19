import type { FastifyPluginAsync } from "fastify";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

const studentClassRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/students/classes",
    {
      onRequest: [authenticate, authorize("student.read")],
    },
    async (request, reply) => {
      if (
        request.user.role !== "SCHOOL_ADMIN" &&
        request.user.role !== "SUPER_ADMIN"
      ) {
        return reply.status(403).send({
          error: {
            code: "FORBIDDEN",
            message: "Only school administrators can access student class options.",
          },
        });
      }

      const schoolId = request.user.schoolId;

      if (!schoolId && request.user.role !== "SUPER_ADMIN") {
        return reply.status(403).send({
          error: {
            code: "SCHOOL_CONTEXT_REQUIRED",
            message: "A school context is required.",
          },
        });
      }

      const classes = await fastify.prisma.schoolClass.findMany({
        where: {
          ...(schoolId ? { schoolId } : {}),
          academicYear: {
            status: "ACTIVE",
            ...(schoolId ? { schoolId } : {}),
          },
        },
        orderBy: [{ level: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          level: true,
          academicYear: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return reply.send({ classes });
    },
  );
};

export default studentClassRoutes;
