export type MessageUser = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  schoolId?: string | null;
};

export type MessageParticipant = {
  id: string;
  userId: string;
  createdAt: string;
  user: MessageUser;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  sender: MessageUser;
};

export type Conversation = {
  id: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
  participants: MessageParticipant[];
  messages?: Message[];
};

export type ConversationsResponse = {
  conversations: Conversation[];
};

export type ConversationMessagesResponse = {
  conversation: Pick<Conversation, "id" | "schoolId">;
  messages: Message[];
};

export type CreateConversationResponse = {
  conversation: Conversation;
  created: boolean;
};

export type SendMessageResponse = {
  message: Message;
};
