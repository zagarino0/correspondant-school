import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { publishToUser } from "../realtime/message-events.js";

const authorizationDecisionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export async function surveillantAuthorizationRoutes(
  fastify: FastifyInstance,
) {
  fastify.patch(
    "/authorizations/:authorizationId",
    {
      onRequest: [authenticate],
      preHandler: [authorize("authorization.update")],
    },
    async (request, reply) => {
      const { authorizationId } = request.params as {
        authorizationId: string;
      };

      const parsed = authorizationDecisionSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Une décision APPROVED ou REJECTED est requise.",
          },
        });
      }

      const schoolId = request.user.schoolId;

      if (!schoolId) {
        return reply.status(403).send({
          error: {
            code: "SCHOOL_REQUIRED",
            message: "Une affectation à un établissement est requise.",
          },
        });
      }

      const existing = await fastify.prisma.parentAuthorization.findFirst({
        where: {
          id: authorizationId,
          schoolId,
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
              firstName: true,
              lastName: true,
              studentNumber: true,
            },
          },
        },
      });

      if (!existing) {
        return reply.status(404).send({
          error: {
            code: "AUTHORIZATION_NOT_FOUND",
            message: "Autorisation introuvable dans cet établissement.",
          },
        });
      }

      if (existing.status !== "PENDING") {
        return reply.status(409).send({
          error: {
            code: "AUTHORIZATION_ALREADY_DECIDED",
            message: "Cette autorisation a déjà été traitée.",
          },
        });
      }

      const decidedAt = new Date();

      const item = await fastify.prisma.parentAuthorization.update({
        where: { id: existing.id },
        data: {
          status: parsed.data.status,
          decidedAt,
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
              firstName: true,
              lastName: true,
              studentNumber: true,
            },
          },
        },
      });

      publishToUser(item.parentId, "parent:authorization:updated", {
        id: item.id,
        studentId: item.studentId,
        type: item.type,
        status: item.status,
        reason: item.reason,
        requestedAt: item.requestedAt,
        decidedAt: item.decidedAt,
        student: item.student,
      });

      return reply.send({ item });
    },
  );
}
