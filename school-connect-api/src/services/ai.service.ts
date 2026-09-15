import type { AuthorizedContext } from "../authorization/authorized-context.js";
import type { LLMProvider } from "./llm.provider.js";

export interface AIChatInput {
  message: string;
  conversationId?: string;
  context: AuthorizedContext;
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
  constructor(private readonly llmProvider: LLMProvider) {}

  async chat(input: AIChatInput): Promise<AIChatResult> {
    void input.context;

    const result = await this.llmProvider.chat({
      messages: [
        {
          role: "user",
          content: input.message,
        },
      ],
    });

    return {
      conversationId: input.conversationId ?? null,
      message: {
        role: "assistant",
        content: result.content,
      },
    };
  }
}

const stubLLMProvider: LLMProvider = {
  async chat() {
    return {
      content: "LLM provider stub.",
    };
  },
};

export const aiService: AIService = new AIServiceImpl(stubLLMProvider);
