import type { LLMProvider } from "./llm.provider.js";
import { OpenAIProvider } from "./openai.provider.js";
import { StubLLMProvider } from "./llm.stub.provider.js";

export function createLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER?.trim().toLowerCase() ?? "stub";

  if (provider === "stub") {
    return new StubLLMProvider();
  }

  if (provider === "openai") {
    return new OpenAIProvider();
  }

  throw new Error(`Unsupported LLM provider: ${provider}`);
}
