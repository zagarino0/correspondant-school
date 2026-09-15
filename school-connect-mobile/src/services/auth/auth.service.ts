import { apiClient } from "../api/client";
import {
  clearSession,
  saveSession,
} from "../storage/secureStorage";
import type { AuthSession } from "../../types/auth";
import type { AuthMeResponse } from "../../features/auth/auth.types";

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthSession["user"];
}

export async function login(
  email: string,
  password: string,
): Promise<AuthSession> {
  const payload: LoginPayload = { email, password };

  const response = await apiClient.post<LoginResponse>(
    "/api/v1/auth/login",
    payload,
  );

  const session: AuthSession = {
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
    user: response.data.user,
  };

  await saveSession(session);

  return session;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const response = await apiClient.post<{
    accessToken: string;
    refreshToken: string;
  }>("/api/v1/auth/refresh", {
    refreshToken,
  });

  return response.data;
}

export async function logout(): Promise<void> {
  await clearSession();
}
export async function getCurrentUser(): Promise<
  AuthMeResponse["user"]
> {
  const response = await apiClient.get<AuthMeResponse>(
    "/api/v1/auth/me",
  );

  return response.data.user;
}

