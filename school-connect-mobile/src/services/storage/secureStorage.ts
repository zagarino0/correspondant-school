import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import type { AuthSession } from "../../types/auth";

const AUTH_SESSION_KEY = "school_connect_auth_session";

const ACCESS_TOKEN_KEY = "school_connect_access_token";
const REFRESH_TOKEN_KEY = "school_connect_refresh_token";

async function setItem(key: string, value: string) {
  if (Platform.OS === "web") {
    window.localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string) {
  if (Platform.OS === "web") {
    return window.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  if (Platform.OS === "web") {
    window.localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}
export async function saveSession(session: AuthSession) {
  await setItem(AUTH_SESSION_KEY, JSON.stringify(session));

  await setItem(ACCESS_TOKEN_KEY, session.accessToken);
  await setItem(REFRESH_TOKEN_KEY, session.refreshToken);
}

export async function getSession(): Promise<AuthSession | null> {
  const value = await getItem(AUTH_SESSION_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthSession;
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession() {
  await deleteItem(AUTH_SESSION_KEY);
  await deleteItem(ACCESS_TOKEN_KEY);
  await deleteItem(REFRESH_TOKEN_KEY);
}

export async function saveTokens(
  accessToken: string,
  refreshToken: string,
) {
  await setItem(ACCESS_TOKEN_KEY, accessToken);
  await setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export async function updateSessionTokens(
  accessToken: string,
  refreshToken: string,
) {
  const session = await getSession();

  if (!session) {
    await saveTokens(accessToken, refreshToken);
    return;
  }

  await saveSession({
    ...session,
    accessToken,
    refreshToken,
  });
}

export async function getAccessToken(): Promise<string | null> {
  return getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(REFRESH_TOKEN_KEY);
}

export async function clearTokens() {
  await deleteItem(ACCESS_TOKEN_KEY);
  await deleteItem(REFRESH_TOKEN_KEY);
}