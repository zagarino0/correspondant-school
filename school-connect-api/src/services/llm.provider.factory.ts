import type { LLMProvider } from "./llm.provider.js";
import { StubLLMProvider } from "./llm.stub.provider.js";

export function createLLMProvider(): LLMProvider {
  return new StubLLMProvider();
}
