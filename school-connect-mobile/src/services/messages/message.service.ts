import { apiClient } from "../api/client";
import type {
  ConversationMessagesResponse,
  ConversationsResponse,
  CreateConversationResponse,
  SendMessageResponse,
} from "../../features/messages/message.types";

export async function getMyConversations(): Promise<ConversationsResponse> {
  const response = await apiClient.get<ConversationsResponse>(
    "/api/v1/messages/conversations",
  );
  return response.data;
}

export async function getConversationMessages(
  conversationId: string,
): Promise<ConversationMessagesResponse> {
  const response = await apiClient.get<ConversationMessagesResponse>(
    `/api/v1/messages/conversations/${conversationId}/messages`,
  );
  return response.data;
}

export async function createConversation(
  recipientUserId: string,
): Promise<CreateConversationResponse> {
  const response = await apiClient.post<CreateConversationResponse>(
    "/api/v1/messages/conversations",
    { recipientUserId },
  );
  return response.data;
}

export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<SendMessageResponse> {
  const response = await apiClient.post<SendMessageResponse>(
    `/api/v1/messages/conversations/${conversationId}/messages`,
    { content },
  );
  return response.data;
}
