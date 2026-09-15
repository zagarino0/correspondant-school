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

export type LLMErrorCode =
  | "LLM_TIMEOUT"
  | "LLM_AUTHENTICATION"
  | "LLM_RATE_LIMITED"
  | "LLM_UNAVAILABLE"
  | "LLM_INVALID_RESPONSE"
  | "LLM_UNKNOWN";

export class LLMProviderError extends Error {
  constructor(
    public readonly code: LLMErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "LLMProviderError";
  }
}

export interface LLMProvider {
  chat(input: LLMChatInput): Promise<LLMChatResult>;
}
