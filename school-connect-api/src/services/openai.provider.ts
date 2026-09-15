import OpenAI from "openai";

import {
  LLMProviderError,
  type LLMChatInput,
  type LLMChatResult,
  type LLMMessage,
  type LLMProvider,
} from "./llm.provider.js";

function mapOpenAIError(error: unknown): LLMProviderError {
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return new LLMProviderError("LLM_TIMEOUT", "LLM request timed out.", {
      cause: error,
    });
  }

  if (error instanceof OpenAI.AuthenticationError) {
    return new LLMProviderError("LLM_AUTHENTICATION", "LLM authentication failed.", {
      cause: error,
    });
  }

  if (error instanceof OpenAI.RateLimitError) {
    return new LLMProviderError("LLM_RATE_LIMITED", "LLM rate limit reached.", {
      cause: error,
    });
  }

  if (error instanceof OpenAI.APIConnectionError || error instanceof OpenAI.APIError) {
    return new LLMProviderError("LLM_UNAVAILABLE", "LLM provider unavailable.", {
      cause: error,
    });
  }

  return new LLMProviderError("LLM_UNKNOWN", "Unknown LLM provider error.", {
    cause: error,
  });
}

function toOpenAIInput(messages: LLMMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

export class OpenAIProvider implements LLMProvider {
  async chat(input: LLMChatInput): Promise<LLMChatResult> {
    if (input.config.apiKey === undefined) {
      throw new LLMProviderError(
        "LLM_AUTHENTICATION",
        "LLM API key is required.",
      );
    }

    if (input.config.model === undefined) {
      throw new LLMProviderError(
        "LLM_INVALID_RESPONSE",
        "LLM model is required.",
      );
    }

    const client = new OpenAI({
      apiKey: input.config.apiKey,
      timeout: input.config.timeoutMs,
      maxRetries: 0,
    });

    try {
      const response = await client.responses.create({
        model: input.config.model,
        input: toOpenAIInput(input.messages),
      });

      if (typeof response.output_text !== "string") {
        throw new LLMProviderError(
          "LLM_INVALID_RESPONSE",
          "LLM provider returned an invalid response.",
        );
      }

      return {
        content: response.output_text,
      };
    } catch (error) {
      if (error instanceof LLMProviderError) {
        throw error;
      }

      throw mapOpenAIError(error);
    }
  }
}
