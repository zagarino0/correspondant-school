export interface AIChatInput {
  message: string;
  conversationId?: string;
}

export interface AIChatResult {
  conversationId: string | null;
  message: {
    role: "assistant";
    content: string;
  };
}

export interface AIService {
  chat(input: AIChatInput): Promise<AIChatResult>;
}
