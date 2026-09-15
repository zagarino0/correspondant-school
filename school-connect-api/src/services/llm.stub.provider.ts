import type { LLMChatInput, LLMChatResult, LLMProvider } from "./llm.provider.js";

export class StubLLMProvider implements LLMProvider {
  async chat(_input: LLMChatInput): Promise<LLMChatResult> {
    return {
      content: "LLM provider stub.",
    };
  }
}
