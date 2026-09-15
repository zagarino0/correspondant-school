import type { FastifyPluginAsync } from "fastify";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

const schoolRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/schools/:schoolId",
    {
      onRequest: [
        authenticate,
        authorize("school.read"),
      ],
    },
    async (request, reply) => {
      const { schoolId } = request.params as {
        schoolId: string;
      };

      const school = await fastify.prisma.school.findUnique({
        where: {
          id: schoolId,
        },
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!school) {
        return reply.status(404).send({
          error: {
            code: "SCHOOL_NOT_FOUND",
            message: "School not found.",
          },
        });
      }

      // SUPER_ADMIN : accès global
      if (request.user.role === "SUPER_ADMIN") {
        return reply.send({
          school,
        });
      }

      // SCHOOL_ADMIN : uniquement sa propre école
      if (
        request.user.role === "SCHOOL_ADMIN" &&
        request.user.schoolId === school.id
      ) {
        return reply.send({
          school,
        });
      }

      return reply.status(403).send({
        error: {
          code: "RESOURCE_ACCESS_DENIED",
          message: "You do not have access to this school.",
        },
      });
    }
  );
};

export default schoolRoutes;