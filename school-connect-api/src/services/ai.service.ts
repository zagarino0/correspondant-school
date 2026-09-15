import type { AuthorizedContext } from "../authorization/authorized-context.js";
import { env } from "../config/env.js";
import {
  LLMProviderError,
  type LLMProvider,
} from "./llm.provider.js";

export type AIServiceErrorCode = "AI_SERVICE_ERROR" | "AI_RATE_LIMITED";

export class AIServiceError extends Error {
  constructor(
    public readonly code: AIServiceErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "AIServiceError";
  }
}

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

function normalizeLLMError(error: unknown): AIServiceError {
  if (!(error instanceof LLMProviderError)) {
    return new AIServiceError(
      "AI_SERVICE_ERROR",
      "AI service unavailable.",
      { cause: error },
    );
  }

  if (error.code === "LLM_RATE_LIMITED") {
    return new AIServiceError(
      "AI_RATE_LIMITED",
      "AI service rate limit reached.",
      { cause: error },
    );
  }

  return new AIServiceError(
    "AI_SERVICE_ERROR",
    "AI service unavailable.",
    { cause: error },
  );
}

export class AIServiceImpl implements AIService {
  constructor(private readonly llmProvider: LLMProvider) {}

  async chat(input: AIChatInput): Promise<AIChatResult> {
    void input.context;

    try {
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
    } catch (error) {
      throw normalizeLLMError(error);
    }
  }
}

const stubLLMProvider: LLMProvider = {
  async chat() {
    return {
      content: "LLM provider stub.",
    };
  },
};

void env.LLM_API_KEY;
void env.LLM_MODEL;
void env.LLM_TIMEOUT_MS;

export const aiService: AIService = new AIServiceImpl(stubLLMProvider);
