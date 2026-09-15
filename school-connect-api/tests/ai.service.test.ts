import { describe, expect, it } from "vitest";

import type { AuthorizedContext } from "../src/authorization/authorized-context.js";
import {
  AIServiceError,
  AIServiceImpl,
} from "../src/services/ai.service.js";
import {
  LLMProviderError,
  type LLMProvider,
} from "../src/services/llm.provider.js";

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
  it("returns the provider response on success", async () => {
    const provider: LLMProvider = {
      async chat(input) {
        expect(input.messages).toEqual([
          {
            role: "user",
            content: "Bonjour",
          },
        ]);

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
