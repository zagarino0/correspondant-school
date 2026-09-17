import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

import { env } from "../../config/env";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  updateSessionTokens,
} from "../storage/secureStorage";
import { normalizeApiError } from "./errors";

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

let refreshPromise: Promise<RefreshResponse> | null = null;

async function refreshTokens(): Promise<RefreshResponse> {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    throw new Error("Refresh token unavailable.");
  }

  const response = await axios.post<RefreshResponse>(
    `${env.apiUrl}/api/v1/auth/refresh`,
    { refreshToken },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 15_000,
    },
  );

  await updateSessionTokens(
    response.data.accessToken,
    response.data.refreshToken,
  );

  return response.data;
}

export function setupApiInterceptors(client: AxiosInstance) {
  client.interceptors.request.use(async (config) => {
    const accessToken = await getAccessToken();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest =
        error.config as RetryableRequestConfig | undefined;

      if (
        error.response?.status !== 401 ||
        !originalRequest ||
        originalRequest._retry ||
        originalRequest.url?.endsWith("/auth/login") ||
        originalRequest.url?.endsWith("/auth/refresh")
      ) {
        return Promise.reject(normalizeApiError(error));
      }

      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = refreshTokens().finally(() => {
            refreshPromise = null;
          });
        }

        const tokens = await refreshPromise;

        originalRequest.headers.Authorization =
          `Bearer ${tokens.accessToken}`;

        return client.request(originalRequest);
      } catch (refreshError) {
        await clearSession();

        return Promise.reject(normalizeApiError(refreshError));
      }
    },
  );
}
