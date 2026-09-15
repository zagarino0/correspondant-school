import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { authenticate } from "../middleware/authenticate.js";
import { aiService } from "../services/ai.service.js";

const aiChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  conversationId: z.string().trim().min(1).optional(),
}).strict();

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

      const { message, conversationId } = result.data;

      const response = await aiService.chat({
        message,
        ...(conversationId !== undefined ? { conversationId } : {}),
      });

      return reply.code(200).send(response);
    },
  );
}
