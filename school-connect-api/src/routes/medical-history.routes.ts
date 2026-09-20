import type { FastifyPluginAsync } from "fastify";

import { authenticate } from "../middleware/authenticate.js";
import { canAccessTarget } from "../authorization/medical-access.js";

export const medicalHistoryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/:userId",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const { userId } = request.params as { userId: string };

      const { access, target } = await canAccessTarget(
        fastify,
        request.user.sub,
        request.user.role,
        request.user.schoolId ?? null,
        userId,
      );

      if (!target) {
        return reply.status(403).send({
          error: {
            code: "MEDICAL_HISTORY_ACCESS_DENIED",
            message: access.reason ?? "Accès à l'historique médical refusé.",
          },
        });
      }

      const history = await fastify.prisma.medicalHistory.findMany({
        where: { targetUserId: userId },
        select: {
          id: true,
          action: true,
          field: true,
          previousValue: true,
          newValue: true,
          createdAt: true,
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              staffProfile: { select: { function: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        access,
        targetUserId: userId,
        history: history.map((entry) => ({
          ...entry,
          actor: {
            ...entry.actor,
            function: entry.actor.staffProfile?.function ?? null,
          },
        })),
      };
    },
  );
};

export default medicalHistoryRoutes;
