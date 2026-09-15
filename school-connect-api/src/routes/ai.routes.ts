import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { buildAuthorizedContext } from "../authorization/authorized-context-builder.js";
import type { Role } from "../authorization/roles.js";
import { authenticate } from "../middleware/authenticate.js";
import { aiService } from "../services/ai.service.js";

const aiChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  conversationId: z.string().trim().min(1).optional(),
}).strict();

const roleSchema = z.enum([
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "TEACHER",
  "PARENT",
  "STUDENT",
  "STAFF",
]);

export async function aiRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.post(
    "/chat",
    {
      onRequest: [authenticate],
    },
    async (request, reply) => {
      const result = aiChatRequestSchema.safeParse(request.body);

      if (!result.success) {
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request.",
          },
        });
      }

      const roleResult = roleSchema.safeParse(request.user.role);

      if (!roleResult.success) {
        return reply.code(401).send({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required.",
          },
        });
      }

      const identity = {
        userId: request.user.sub,
        role: roleResult.data as Role,
        schoolId: request.user.schoolId,
      };

      const context = await buildAuthorizedContext(app.prisma, identity);
      const { message, conversationId } = result.data;

      const response = await aiService.chat({
        message,
        ...(conversationId !== undefined ? { conversationId } : {}),
        context,
      });

      return reply.code(200).send(response);
    },
  );
}
