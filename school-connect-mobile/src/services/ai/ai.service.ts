import { apiClient } from "../api/client";
import type {
  AIChatRequest,
  AIChatResponse,
} from "../../features/ai/ai.types";

export async function sendAIMessage(
  payload: AIChatRequest,
): Promise<AIChatResponse> {
  const response = await apiClient.post<AIChatResponse>(
    "/api/v1/ai/chat",
    payload,
  );

  return response.data;
}
