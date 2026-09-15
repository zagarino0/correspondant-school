import { describe, expect, it } from "vitest";

import { createLLMProvider } from "../src/services/llm.provider.factory.js";
import { StubLLMProvider } from "../src/services/llm.stub.provider.js";
import type { LLMChatInput } from "../src/services/llm.provider.js";

describe("StubLLMProvider", () => {
  it("returns a valid LLMChatResult", async () => {
    const provider = new StubLLMProvider();

    const input: LLMChatInput = {
      messages: [
        {
          role: "user",
          content: "Bonjour",
        },
      ],
      config: {
        timeoutMs: 30000,
      },
    };

    await expect(provider.chat(input)).resolves.toEqual({
      content: "LLM provider stub.",
    });
  });

  it("accepts provider configuration without performing external calls", async () => {
    const provider = new StubLLMProvider();

    await expect(
      provider.chat({
        messages: [
          {
            role: "system",
            content: "Tu es un assistant scolaire.",
          },
          {
            role: "user",
            content: "Quels sont mes devoirs ?",
          },
        ],
        config: {
          apiKey: "test-api-key",
          model: "test-model",
          timeoutMs: 5000,
        },
      }),
    ).resolves.toEqual({
      content: "LLM provider stub.",
    });
  });
});

describe("createLLMProvider", () => {
  it("returns a functional LLM provider", async () => {
    const provider = createLLMProvider();

    expect(provider).toBeInstanceOf(StubLLMProvider);

    await expect(
      provider.chat({
        messages: [
          {
            role: "user",
            content: "Test factory",
          },
        ],
        config: {
          timeoutMs: 30000,
        },
      }),
    ).resolves.toEqual({
      content: "LLM provider stub.",
    });
  });
});
