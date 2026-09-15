import { afterEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
  LLM_PROVIDER: "stub" as "stub" | "openai",
}));

vi.mock("../src/config/env.js", () => ({
  env: envMock,
}));

import { createLLMProvider } from "../src/services/llm.provider.factory.js";
import { StubLLMProvider } from "../src/services/llm.stub.provider.js";
import { OpenAIProvider } from "../src/services/openai.provider.js";
import type { LLMChatInput } from "../src/services/llm.provider.js";

afterEach(() => {
  envMock.LLM_PROVIDER = "stub";
});

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
  it("defaults to the stub provider when LLM_PROVIDER is not set", () => {
    envMock.LLM_PROVIDER = "stub";

    expect(createLLMProvider()).toBeInstanceOf(StubLLMProvider);
  });

  it("selects the stub provider explicitly", () => {
    envMock.LLM_PROVIDER = "stub";

    expect(createLLMProvider()).toBeInstanceOf(StubLLMProvider);
  });

  it("selects the OpenAI provider explicitly", () => {
    envMock.LLM_PROVIDER = "openai";

    expect(createLLMProvider()).toBeInstanceOf(OpenAIProvider);
  });

  it("reads the OpenAI provider from centralized environment configuration", () => {
    envMock.LLM_PROVIDER = "openai";

    expect(createLLMProvider()).toBeInstanceOf(OpenAIProvider);
  });

  it("uses the default provider after resetting centralized environment configuration", () => {
    envMock.LLM_PROVIDER = "openai";
    expect(createLLMProvider()).toBeInstanceOf(OpenAIProvider);

    envMock.LLM_PROVIDER = "stub";
    expect(createLLMProvider()).toBeInstanceOf(StubLLMProvider);
  });

  it("returns a functional stub provider", async () => {
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
