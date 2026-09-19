import type { Message } from "../../features/messages/message.types";

export type RealtimeEvent =
  | {
      type: "message:new";
      payload: Message;
    }
  | {
      type: "message:delivered";
      payload: {
        messageId: string;
        conversationId: string;
        deliveredAt: string;
      };
    }
  | {
      type: "message:read";
      payload: {
        messageId: string;
        conversationId: string;
        readAt: string;
      };
    }
  | {
      type: "error";
      payload: {
        code: string;
      };
    };

export type RealtimeEventHandler = (event: RealtimeEvent) => void;
