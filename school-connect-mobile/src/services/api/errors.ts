import axios from "axios";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "INVALID_REFRESH_TOKEN"
  | "UNKNOWN_ERROR";
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;
  readonly details?: unknown;

  constructor(
    code: ApiErrorCode,
    message: string,
    status?: number,
    details?: unknown,
  ) {
    super(message);

    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function normalizeApiError(
  error: unknown,
): ApiError {
  if (!axios.isAxiosError(error)) {
    if (error instanceof ApiError) {
      return error;
    }

    return new ApiError(
      "UNKNOWN_ERROR",
      "Une erreur inattendue est survenue.",
    );
  }

  if (!error.response) {
    return new ApiError(
      "NETWORK_ERROR",
      "Impossible de joindre le serveur.",
    );
  }

  const status = error.response.status;
 const data = error.response.data as
  | {
      message?: string;
      error?: string | {
        code?: string;
        message?: string;
      };
      details?: unknown;
    }
  | undefined;
  
  const backendError =
  typeof data?.error === "object"
    ? data.error
    : undefined;

const backendCode = backendError?.code;
  const message =
  data?.message ??
  backendError?.message ??
  (typeof data?.error === "string"
    ? data.error
    : undefined) ??
  error.message ??
  "Une erreur API est survenue.";

  if (status === 401) {
  if (backendCode === "INVALID_REFRESH_TOKEN") {
    return new ApiError(
      "INVALID_REFRESH_TOKEN",
      message,
      status,
      data?.details,
    );
  }

  return new ApiError(
    "UNAUTHORIZED",
    message,
    status,
    data?.details,
  );
}

  if (status === 403) {
    return new ApiError(
      "FORBIDDEN",
      message,
      status,
      data?.details,
    );
  }

  if (status === 404) {
    return new ApiError(
      "NOT_FOUND",
      message,
      status,
      data?.details,
    );
  }

  if (status === 422) {
    return new ApiError(
      "VALIDATION_ERROR",
      message,
      status,
      data?.details,
    );
  }

  if (status >= 500) {
    return new ApiError(
      "SERVER_ERROR",
      "Le serveur a rencontré une erreur.",
      status,
      data?.details,
    );
  }

  return new ApiError(
    "UNKNOWN_ERROR",
    message,
    status,
    data?.details,
  );
}