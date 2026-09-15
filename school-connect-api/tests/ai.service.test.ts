import { describe, expect, it, vi } from "vitest";

import type { AuthorizedContext } from "../src/authorization/authorized-context.js";
import { env } from "../src/config/env.js";
import {
  AIServiceError,
  AIServiceImpl,
  aiService,
} from "../src/services/ai.service.js";
import {
  LLMProviderError,
  type LLMProvider,
} from "../src/services/llm.provider.js";

const factoryProvider = vi.hoisted(() => ({
  chat: vi.fn(async () => ({
    content: "Réponse du provider sélectionné",
  })),
}));

vi.mock("../src/services/llm.provider.factory.js", () => ({
  createLLMProvider: vi.fn(() => factoryProvider),
}));

const context: AuthorizedContext = {
  userId: "user-test",
  role: "TEACHER",
  schoolId: "school-test",
  childUserIds: [],
  assignedSchoolIds: [],
  assignedClassIds: [],
};

function createFailingProvider(error: unknown): LLMProvider {
  return {
    async chat() {
      throw error;
    },
  };
}

describe("AIServiceImpl", () => {
  it("returns the provider response and forwards the provider config", async () => {
    const provider: LLMProvider = {
      async chat(input) {
        expect(input.messages).toEqual([
          {
            role: "user",
            content: "Bonjour",
          },
        ]);

        expect(input.config).toEqual({
          ...(env.LLM_API_KEY !== undefined
            ? { apiKey: env.LLM_API_KEY }
            : {}),
          ...(env.LLM_MODEL !== undefined
            ? { model: env.LLM_MODEL }
            : {}),
          timeoutMs: env.LLM_TIMEOUT_MS,
        });

        return {
          content: "Réponse test",
        };
      },
    };

    const service = new AIServiceImpl(provider);

    await expect(
      service.chat({
        message: "Bonjour",
        conversationId: "conv-test",
        context,
      }),
    ).resolves.toEqual({
      conversationId: "conv-test",
      message: {
        role: "assistant",
        content: "Réponse test",
      },
    });
  });

  it("uses the provider returned by the LLM provider factory", async () => {
    factoryProvider.chat.mockClear();

    await expect(
      aiService.chat({
        message: "Bonjour factory",
        context,
      }),
    ).resolves.toEqual({
      conversationId: null,
      message: {
        role: "assistant",
        content: "Réponse du provider sélectionné",
      },
    });

    expect(factoryProvider.chat).toHaveBeenCalledTimes(1);
    expect(factoryProvider.chat).toHaveBeenCalledWith({
      messages: [
        {
          role: "user",
          content: "Bonjour factory",
        },
      ],
      config: {
        ...(env.LLM_API_KEY !== undefined
          ? { apiKey: env.LLM_API_KEY }
          : {}),
        ...(env.LLM_MODEL !== undefined
          ? { model: env.LLM_MODEL }
          : {}),
        timeoutMs: env.LLM_TIMEOUT_MS,
      },
    });
  });

  it("maps LLM_RATE_LIMITED to AI_RATE_LIMITED", async () => {
    const service = new AIServiceImpl(
      createFailingProvider(
        new LLMProviderError("LLM_RATE_LIMITED", "provider rate limit"),
      ),
    );

    await expect(
      service.chat({ message: "Bonjour", context }),
    ).rejects.toMatchObject({
      name: "AIServiceError",
      code: "AI_RATE_LIMITED",
      message: "AI service rate limit reached.",
    });
  });

  it.each([
    "LLM_TIMEOUT",
    "LLM_AUTHENTICATION",
    "LLM_UNAVAILABLE",
    "LLM_INVALID_RESPONSE",
    "LLM_UNKNOWN",
  ] as const)("maps %s to AI_SERVICE_ERROR", async (code) => {
    const providerError = new LLMProviderError(code, "provider error");
    const service = new AIServiceImpl(createFailingProvider(providerError));

    await expect(
      service.chat({ message: "Bonjour", context }),
    ).rejects.toMatchObject({
      name: "AIServiceError",
      code: "AI_SERVICE_ERROR",
      message: "AI service unavailable.",
    });
  });

  it("maps unknown errors to AI_SERVICE_ERROR and preserves the cause", async () => {
    const cause = new Error("unexpected provider failure");
    const service = new AIServiceImpl(createFailingProvider(cause));

    await expect(
      service.chat({ message: "Bonjour", context }),
    ).rejects.toMatchObject({
      name: "AIServiceError",
      code: "AI_SERVICE_ERROR",
      message: "AI service unavailable.",
      cause,
    });
  });

  it("preserves the LLMProviderError as the cause", async () => {
    const providerError = new LLMProviderError(
      "LLM_TIMEOUT",
      "provider timeout",
    );
    const service = new AIServiceImpl(createFailingProvider(providerError));

    try {
      await service.chat({ message: "Bonjour", context });
      throw new Error("Expected AIServiceError");
    } catch (error) {
      expect(error).toBeInstanceOf(AIServiceError);
      expect(error).toMatchObject({
        code: "AI_SERVICE_ERROR",
        cause: providerError,
      });
    }
  });
});
