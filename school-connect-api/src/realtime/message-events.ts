import type { PrismaClient } from "@prisma/client";

import type {
  RealtimeEnvelope,
  RealtimeMessage,
  RealtimeSocket,
} from "./websocket.types.js";

const OPEN_STATE = 1;

const socketsByUserId = new Map<string, Set<RealtimeSocket>>();

function sendEvent<T>(
  socket: RealtimeSocket,
  event: RealtimeEnvelope<T>,
): void {
  if (socket.readyState !== OPEN_STATE) {
    return;
  }

  try {
    socket.send(JSON.stringify(event));
  } catch {
    // A socket may close between the readyState check and send().
  }
}

export function registerRealtimeSocket(
  userId: string,
  socket: RealtimeSocket,
): void {
  const sockets = socketsByUserId.get(userId) ?? new Set<RealtimeSocket>();
  sockets.add(socket);
  socketsByUserId.set(userId, sockets);
}

export function unregisterRealtimeSocket(
  userId: string,
  socket: RealtimeSocket,
): void {
  const sockets = socketsByUserId.get(userId);

  if (!sockets) {
    return;
  }

  sockets.delete(socket);

  if (sockets.size === 0) {
    socketsByUserId.delete(userId);
  }
}

export function isUserConnected(userId: string): boolean {
  return (socketsByUserId.get(userId)?.size ?? 0) > 0;
}

export function publishToUser<T>(
  userId: string,
  type: RealtimeEnvelope<T>["type"],
  payload: T,
): void {
  const sockets = socketsByUserId.get(userId);

  if (!sockets) {
    return;
  }

  const event: RealtimeEnvelope<T> = {
    type,
    payload,
  };

  for (const socket of sockets) {
    sendEvent(socket, event);
  }
}

export function publishMessageToParticipants(
  participantUserIds: string[],
  type: "message:new" | "message:delivered" | "message:read",
  payload: unknown,
): void {
  for (const userId of new Set(participantUserIds)) {
    publishToUser(userId, type, payload);
  }
}

export async function publishMessageCreated(
  prisma: PrismaClient,
  message: RealtimeMessage,
): Promise<void> {
  const participants = await prisma.conversationParticipant.findMany({
    where: {
      conversationId: message.conversationId,
      userId: {
        not: message.senderId,
      },
    },
    select: {
      userId: true,
    },
  });

  for (const participant of participants) {
    publishToUser(participant.userId, "message:new", message);

    if (isUserConnected(participant.userId)) {
      await markMessagesDeliveredForUser(
        prisma,
        participant.userId,
        message.conversationId,
      );
    }
  }
}

export async function markMessagesDeliveredForUser(
  prisma: PrismaClient,
  userId: string,
  conversationId?: string,
): Promise<void> {
  const messages = await prisma.message.findMany({
    where: {
      ...(conversationId ? { conversationId } : {}),
      conversation: {
        participants: {
          some: {
            userId,
          },
        },
      },
      senderId: {
        not: userId,
      },
      deliveredAt: null,
    },
    select: {
      id: true,
      conversationId: true,
      senderId: true,
    },
  });

  if (messages.length === 0) {
    return;
  }

  const deliveredAt = new Date();

  await prisma.message.updateMany({
    where: {
      id: {
        in: messages.map((message) => message.id),
      },
    },
    data: {
      deliveredAt,
    },
  });

  for (const message of messages) {
    publishToUser(message.senderId, "message:delivered", {
      messageId: message.id,
      conversationId: message.conversationId,
      deliveredAt,
    });
  }
}

export async function markConversationRead(
  prisma: PrismaClient,
  userId: string,
  conversationId: string,
): Promise<void> {
  const conversation = await prisma.conversation.findFirst({
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
    },
  });

  if (!conversation) {
    throw new Error("MESSAGE_ACCESS_DENIED");
  }

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      senderId: {
        not: userId,
      },
      readAt: null,
    },
    select: {
      id: true,
      senderId: true,
    },
  });

  if (messages.length === 0) {
    return;
  }

  const readAt = new Date();

  await prisma.message.updateMany({
    where: {
      id: {
        in: messages.map((message) => message.id),
      },
    },
    data: {
      deliveredAt: readAt,
      readAt,
    },
  });

  for (const message of messages) {
    publishToUser(message.senderId, "message:read", {
      messageId: message.id,
      conversationId,
      readAt,
    });
  }
}
