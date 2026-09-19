import websocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";

import { authenticate } from "../middleware/authenticate.js";
import {
  markConversationRead,
  markMessagesDeliveredForUser,
  registerRealtimeSocket,
  unregisterRealtimeSocket,
} from "./message-events.js";
import type { ReadConversationCommand, RealtimeSocket } from "./websocket.types.js";

const MAX_MESSAGE_LENGTH = 1024;

export default async function websocketPlugin(
  app: FastifyInstance,
): Promise<void> {
  await app.register(websocket, {
    options: {
      maxPayload: 16 * 1024,
      perMessageDeflate: false,
    },
  });

  app.get(
    "/ws",
    {
      websocket: true,
      onRequest: [authenticate],
    },
    (socket, request) => {
      const realtimeSocket = socket as RealtimeSocket;
      const userId = request.user.sub;

      registerRealtimeSocket(userId, realtimeSocket);

      socket.on("message", (rawMessage) => {
        if (rawMessage.length > MAX_MESSAGE_LENGTH) {
          socket.close(1009, "Message too large");
          return;
        }

        let command: ReadConversationCommand;

        try {
          const parsed: unknown = JSON.parse(rawMessage.toString());

          if (
            typeof parsed !== "object" ||
            parsed === null ||
            (parsed as { type?: unknown }).type !== "conversation:read" ||
            typeof (parsed as { conversationId?: unknown }).conversationId !==
              "string"
          ) {
            return;
          }

          command = parsed as ReadConversationCommand;
        } catch {
          return;
        }

        const conversationId = command.conversationId.trim();

        if (!conversationId) {
          return;
        }

        void markConversationRead(
          app.prisma,
          userId,
          conversationId,
        ).catch((error: unknown) => {
          if (
            error instanceof Error &&
            error.message === "MESSAGE_ACCESS_DENIED"
          ) {
            socket.send(
              JSON.stringify({
                type: "error",
                payload: {
                  code: "MESSAGE_ACCESS_DENIED",
                },
              }),
            );
          } else {
            request.log.error(error);
          }
        });
      });

      socket.on("close", () => {
        unregisterRealtimeSocket(userId, realtimeSocket);
      });

      socket.on("error", (error) => {
        request.log.warn({ error }, "WebSocket error");
        unregisterRealtimeSocket(userId, realtimeSocket);
      });

      void markMessagesDeliveredForUser(
        app.prisma,
        userId,
      ).catch((error: unknown) => {
        request.log.error(error, "Unable to update delivered message state");
      });
    },
  );
}
