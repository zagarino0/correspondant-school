import { describe, expect, it, vi } from "vitest";

import { OpenAIProvider } from "../src/services/openai.provider.js";
import { LLMProviderError } from "../src/services/llm.provider.js";

const responsesCreate = vi.fn();

vi.mock("openai", () => {
  class APIConnectionTimeoutError extends Error {}
  class AuthenticationError extends Error {}
  class RateLimitError extends Error {}
  class APIConnectionError extends Error {}
  class APIError extends Error {}

  class OpenAI {
    static APIConnectionTimeoutError = APIConnectionTimeoutError;
    static AuthenticationError = AuthenticationError;
    static RateLimitError = RateLimitError;
    static APIConnectionError = APIConnectionError;
    static APIError = APIError;

    responses = {
      create: responsesCreate,
    };
  }

  return { default: OpenAI };
});

describe("OpenAIProvider", () => {
  it("returns response output text", async () => {
    responsesCreate.mockResolvedValueOnce({
      output_text: "Bonjour depuis OpenAI.",
    });

    const provider = new OpenAIProvider();

    await expect(
      provider.chat({
        messages: [
          { role: "system", content: "Tu es un assistant." },
          { role: "user", content: "Bonjour" },
        ],
        config: {
          apiKey: "test-key",
          model: "test-model",
          timeoutMs: 5000,
        },
      }),
    ).resolves.toEqual({ content: "Bonjour depuis OpenAI." });

    expect(responsesCreate).toHaveBeenCalledWith({
      model: "test-model",
      input: [
        { role: "system", content: "Tu es un assistant." },
        { role: "user", content: "Bonjour" },
      ],
    });
  });

  it("rejects when the API key is missing", async () => {
    const provider = new OpenAIProvider();

    await expect(
      provider.chat({
        messages: [{ role: "user", content: "Bonjour" }],
        config: { model: "test-model", timeoutMs: 5000 },
      }),
    ).rejects.toMatchObject({
      code: "LLM_AUTHENTICATION",
    });

    expect(responsesCreate).not.toHaveBeenCalled();
  });

  it("maps OpenAI rate limits", async () => {
    const error = new Error("rate limited");
    responsesCreate.mockRejectedValueOnce(error);

    const provider = new OpenAIProvider();

    await expect(
      provider.chat({
        messages: [{ role: "user", content: "Bonjour" }],
        config: {
          apiKey: "test-key",
          model: "test-model",
          timeoutMs: 5000,
        },
      }),
    ).rejects.toBeInstanceOf(LLMProviderError);
  });
});
