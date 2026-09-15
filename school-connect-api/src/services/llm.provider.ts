export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMChatInput {
  messages: LLMMessage[];
}

export interface LLMChatResult {
  content: string;
}

export interface LLMProviderConfig {
  apiKey?: string;
  model?: string;
  timeoutMs: number;
}

export interface LLMProvider {
  chat(input: LLMChatInput): Promise<LLMChatResult>;
}
