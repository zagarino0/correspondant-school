import type { FastifyInstance } from "fastify";

import { canMessageUser } from "../authorization/message-access.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeResource } from "../middleware/authorize-resource.js";
import {
  markConversationRead,
  markMessagesDeliveredForUser,
  publishMessageCreated,
} from "../realtime/message-events.js";

export async function messageRoutes(
  app: FastifyInstance,
): Promise<void> {
  /**
   * GET /api/v1/messages/conversations/unread-count
   *
   * Retourne le nombre de messages non lus pour l'utilisateur connecté.
   */
  app.get(
    "/conversations/unread-count",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource(
          "message.read",
          async () => true,
        ),
      ],
    },
    async (request, reply) => {
      const userId = request.user.sub;

      const count = await app.prisma.message.count({
        where: {
          senderId: {
            not: userId,
          },
          readAt: null,
          conversation: {
            participants: {
              some: {
                userId,
              },
            },
          },
        },
      });

      return reply.send({ count });
    },
  );

  /**
   * GET /api/v1/messages/conversations
   *
   * Retourne uniquement les conversations auxquelles
   * l'utilisateur connecté participe.
   */
  app.get(
    "/conversations",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource(
          "message.read",
          async () => true,
        ),
      ],
    },
    async (request, reply) => {
      const userId = request.user.sub;

      await markMessagesDeliveredForUser(app.prisma, userId);

      const conversations =
        await app.prisma.conversation.findMany({
          where: {
            participants: {
              some: {
                userId,
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          select: {
            id: true,
            schoolId: true,
            createdAt: true,
            updatedAt: true,
            participants: {
              select: {
                id: true,
                userId: true,
                createdAt: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    schoolId: true,
                  },
                },
              },
            },
            messages: {
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
              select: {
                id: true,
                senderId: true,
                content: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        });

      return reply.send({
        conversations,
      });
    },
  );

  /**
   * GET /api/v1/messages/conversations/:conversationId/messages
   *
   * Retourne les messages d'une conversation à laquelle
   * l'utilisateur connecté participe.
   */
  app.get(
    "/conversations/:conversationId/messages",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource(
          "message.read",
          async () => true,
        ),
      ],
    },
    async (request, reply) => {
      const params = request.params as {
        conversationId?: unknown;
      };

      if (
        typeof params.conversationId !== "string" ||
        params.conversationId.trim().length === 0
      ) {
        return reply.code(400).send({
          error: {
            code: "CONVERSATION_ID_REQUIRED",
            message: "conversationId est obligatoire.",
          },
        });
      }

      const conversationId = params.conversationId.trim();
      const userId = request.user.sub;

      const conversation =
        await app.prisma.conversation.findFirst({
          where: {
            id: conversationId,
            participants: {
              some: {
                userId,
              },
            },
          },
          select: {
            id: true,
            schoolId: true,
          },
        });

      if (!conversation) {
        return reply.code(403).send({
          error: {
            code: "MESSAGE_ACCESS_DENIED",
            message:
              "Vous n'êtes pas autorisé à consulter cette conversation.",
          },
        });
      }

      await markMessagesDeliveredForUser(
        app.prisma,
        userId,
        conversation.id,
      );

      await markConversationRead(
        app.prisma,
        userId,
        conversation.id,
      );

      const messages = await app.prisma.message.findMany({
        where: {
          conversationId: conversation.id,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          conversationId: true,
          senderId: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          deliveredAt: true,
          readAt: true,
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });

      return reply.send({
        conversation,
        messages,
      });
    },
  );

  /**
   * POST /api/v1/messages/conversations/:conversationId/messages
   *
   * Envoie un message dans une conversation à laquelle
   * l'utilisateur connecté participe.
   */
  app.post(
    "/conversations/:conversationId/messages",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource(
          "message.send",
          async () => true,
        ),
      ],
    },
    async (request, reply) => {
      const params = request.params as {
        conversationId?: unknown;
      };

      if (
        typeof params.conversationId !== "string" ||
        params.conversationId.trim().length === 0
      ) {
        return reply.code(400).send({
          error: {
            code: "CONVERSATION_ID_REQUIRED",
            message: "conversationId est obligatoire.",
          },
        });
      }

      const body = request.body as {
        content?: unknown;
      };

      if (
        typeof body.content !== "string" ||
        body.content.trim().length === 0
      ) {
        return reply.code(400).send({
          error: {
            code: "MESSAGE_CONTENT_REQUIRED",
            message: "Le contenu du message est obligatoire.",
          },
        });
      }

      const content = body.content.trim();

      if (content.length > 5000) {
        return reply.code(400).send({
          error: {
            code: "MESSAGE_CONTENT_TOO_LONG",
            message: "Le contenu du message ne doit pas dépasser 5000 caractères.",
          },
        });
      }

      const conversationId = params.conversationId.trim();
      const senderId = request.user.sub;

      const conversation =
        await app.prisma.conversation.findFirst({
          where: {
            id: conversationId,
            participants: {
              some: {
                userId: senderId,
              },
            },
          },
          select: {
            id: true,
            schoolId: true,
          },
        });

      if (!conversation) {
        return reply.code(403).send({
          error: {
            code: "MESSAGE_ACCESS_DENIED",
            message:
              "Vous n'êtes pas autorisé à envoyer un message dans cette conversation.",
          },
        });
      }

      const message = await app.prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId,
          content,
        },
        select: {
          id: true,
          conversationId: true,
          senderId: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          deliveredAt: true,
          readAt: true,
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });

      try {
        await publishMessageCreated(app.prisma, message);
      } catch (error) {
        request.log.error(
          error,
          "Unable to publish realtime message event",
        );
      }

      return reply.code(201).send({
        message,
      });
    },
  );

  /**
   * POST /api/v1/messages/conversations
   *
   * Crée ou retourne une conversation privée entre
   * l'utilisateur connecté et un destinataire autorisé.
   *
   * Le destinataire est fourni par son userId.
   * L'accès métier est contrôlé par canMessageUser().
   */
  app.post(
    "/conversations",
    {
      onRequest: [authenticate],
      preHandler: [
        authorizeResource(
          "message.send",
          async () => true,
        ),
      ],
    },
    async (request, reply) => {
      const body = request.body as {
        recipientUserId?: unknown;
      };

      if (
        typeof body.recipientUserId !== "string" ||
        body.recipientUserId.trim().length === 0
      ) {
        return reply.code(400).send({
          error: {
            code: "RECIPIENT_USER_ID_REQUIRED",
            message: "recipientUserId est obligatoire.",
          },
        });
      }

      const senderId = request.user.sub;
      const recipientId = body.recipientUserId.trim();

      const canMessage = await canMessageUser(
        app.prisma,
        senderId,
        recipientId,
      );

      if (!canMessage) {
        return reply.code(403).send({
          error: {
            code: "MESSAGE_ACCESS_DENIED",
            message:
              "Vous n'êtes pas autorisé à contacter cet utilisateur.",
          },
        });
      }

      const [sender, recipient] = await Promise.all([
        app.prisma.user.findUnique({
          where: {
            id: senderId,
          },
          select: {
            id: true,
            schoolId: true,
          },
        }),
        app.prisma.user.findUnique({
          where: {
            id: recipientId,
          },
          select: {
            id: true,
            schoolId: true,
          },
        }),
      ]);

      if (!sender || !recipient) {
        return reply.code(404).send({
          error: {
            code: "USER_NOT_FOUND",
            message: "Utilisateur introuvable.",
          },
        });
      }

      const schoolId =
        sender.schoolId ?? recipient.schoolId;

      if (!schoolId) {
        return reply.code(400).send({
          error: {
            code: "SCHOOL_REQUIRED",
            message:
              "Une conversation doit être rattachée à un établissement.",
          },
        });
      }

      const existingConversation =
        await app.prisma.conversation.findFirst({
          where: {
            schoolId,
            AND: [
              {
                participants: {
                  some: {
                    userId: senderId,
                  },
                },
              },
              {
                participants: {
                  some: {
                    userId: recipientId,
                  },
                },
              },
            ],
          },
          select: {
            id: true,
            schoolId: true,
            createdAt: true,
            updatedAt: true,
            participants: {
              select: {
                id: true,
                userId: true,
                createdAt: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    schoolId: true,
                  },
                },
              },
            },
          },
        });

      if (existingConversation) {
        return reply.code(200).send({
          conversation: existingConversation,
          created: false,
        });
      }

      const conversation =
        await app.prisma.conversation.create({
          data: {
            schoolId,
            participants: {
              create: [
                {
                  userId: senderId,
                },
                {
                  userId: recipientId,
                },
              ],
            },
          },
          select: {
            id: true,
            schoolId: true,
            createdAt: true,
            updatedAt: true,
            participants: {
              select: {
                id: true,
                userId: true,
                createdAt: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    schoolId: true,
                  },
                },
              },
            },
          },
        });

      return reply.code(201).send({
        conversation,
        created: true,
      });
    },
  );
}
