import { describe, expect, it, vi } from "vitest";

import { OpenAIProvider } from "../src/services/openai.provider.js";
import { LLMProviderError } from "../src/services/llm.provider.js";

const responsesCreate = vi.fn();

let APIConnectionTimeoutError: typeof Error;
let AuthenticationError: typeof Error;
let RateLimitError: typeof Error;
let APIConnectionError: typeof Error;
let APIError: typeof Error;

vi.mock("openai", () => {
  class MockAPIConnectionTimeoutError extends Error {}
  class MockAuthenticationError extends Error {}
  class MockRateLimitError extends Error {}
  class MockAPIConnectionError extends Error {}
  class MockAPIError extends Error {}

  APIConnectionTimeoutError = MockAPIConnectionTimeoutError;
  AuthenticationError = MockAuthenticationError;
  RateLimitError = MockRateLimitError;
  APIConnectionError = MockAPIConnectionError;
  APIError = MockAPIError;

  class OpenAI {
    static APIConnectionTimeoutError = MockAPIConnectionTimeoutError;
    static AuthenticationError = MockAuthenticationError;
    static RateLimitError = MockRateLimitError;
    static APIConnectionError = MockAPIConnectionError;
    static APIError = MockAPIError;

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
  });

  it.each([
    ["timeout", () => new APIConnectionTimeoutError("timeout"), "LLM_TIMEOUT"],
    ["401 authentication", () => new AuthenticationError("unauthorized"), "LLM_AUTHENTICATION"],
    ["429 rate limit", () => new RateLimitError("rate limited"), "LLM_RATE_LIMITED"],
    ["connection failure", () => new APIConnectionError("connection failed"), "LLM_UNAVAILABLE"],
    ["5xx server failure", () => new APIError("server error"), "LLM_UNAVAILABLE"],
    ["unknown failure", () => new Error("unknown"), "LLM_UNKNOWN"],
  ])("maps %s to %s", async (_name, createError, expectedCode) => {
    responsesCreate.mockRejectedValueOnce(createError());

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
    ).rejects.toMatchObject({
      code: expectedCode,
    });
  });

  it("maps an invalid provider response to LLM_INVALID_RESPONSE", async () => {
    responsesCreate.mockResolvedValueOnce({});

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
    ).rejects.toMatchObject({
      code: "LLM_INVALID_RESPONSE",
    });
  });

  it("preserves the original provider error as cause", async () => {
    const originalError = new Error("upstream failure");
    responsesCreate.mockRejectedValueOnce(originalError);

    const provider = new OpenAIProvider();

    const error = await provider
      .chat({
        messages: [{ role: "user", content: "Bonjour" }],
        config: {
          apiKey: "test-key",
          model: "test-model",
          timeoutMs: 5000,
        },
      })
      .catch((caughtError: unknown) => caughtError);

    expect(error).toBeInstanceOf(LLMProviderError);
    expect((error as LLMProviderError).code).toBe("LLM_UNKNOWN");
    expect((error as LLMProviderError).cause).toBe(originalError);
  });
});
