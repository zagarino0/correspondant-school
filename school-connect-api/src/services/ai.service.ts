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

export class AIServiceImpl implements AIService {
  async chat(input: AIChatInput): Promise<AIChatResult> {
    return {
      conversationId: input.conversationId ?? null,
      message: {
        role: "assistant",
        content: "AI service stub.",
      },
    };
  }
}

export const aiService: AIService = new AIServiceImpl();
