export type RealtimeEventType =
  | "message:new"
  | "message:delivered"
  | "message:read"
  | "attendance:event"
  | "parent:summons:new"
  | "parent:summons:updated"
  | "school-life:alert";

export interface RealtimeMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  deliveredAt: Date | null;
  readAt: Date | null;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface RealtimeEnvelope<T = unknown> {
  type: RealtimeEventType;
  payload: T;
}

export interface RealtimeSocket {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export interface ReadConversationCommand {
  type: "conversation:read";
  conversationId: string;
}
