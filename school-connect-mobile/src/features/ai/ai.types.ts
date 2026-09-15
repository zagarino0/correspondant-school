export type AIMessageRole = "user" | "assistant";

export type AIChatMessage = {
  role: AIMessageRole;
  content: string;
};

export type AIChatRequest = {
  message: string;
  conversationId?: string;
};

export type AIChatResponse = {
  conversationId: string;
  message: AIChatMessage;
};
