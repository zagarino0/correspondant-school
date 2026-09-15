const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    "EXPO_PUBLIC_API_URL is not configured."
  );
}

export const env = {
  apiUrl: API_URL.replace(/\/+$/, ""),
} as const;