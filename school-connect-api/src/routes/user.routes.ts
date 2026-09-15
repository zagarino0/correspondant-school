import type { FastifyPluginAsync } from "fastify";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { canAccessUser } from "../authorization/user-access.js";

const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/users/:userId",
    {
      onRequest: [
        authenticate,
        authorize("user.read"),
      ],
    },
    async (request, reply) => {
      const { userId } = request.params as {
        userId: string;
      };

      const hasAccess = await canAccessUser({
        prisma: fastify.prisma,
        requesterId: request.user.sub,
        requesterRole: request.user.role as
          | "SUPER_ADMIN"
          | "SCHOOL_ADMIN"
          | "TEACHER"
          | "PARENT"
          | "STUDENT"
          | "STAFF",
        requesterSchoolId: request.user.schoolId,
        targetUserId: userId,
      });

      if (!hasAccess) {
        return reply.status(403).send({
          error: {
            code: "RESOURCE_ACCESS_DENIED",
            message:
              "You do not have access to this user.",
          },
        });
      }

      const user = await fastify.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          schoolId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return reply.status(404).send({
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found.",
          },
        });
      }

      return reply.send({
        user,
      });
    }
  );
};

export default userRoutes;