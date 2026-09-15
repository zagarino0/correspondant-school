import OpenAI from "openai";
import { LLMProviderError } from "./llm.provider.js";

export class OpenAIProvider {
  async chat(): Promise<never> {
    throw new LLMProviderError("LLM_UNKNOWN", "Not implemented yet.");
  }
}
