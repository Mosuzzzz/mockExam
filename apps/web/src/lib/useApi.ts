import { useAuth } from "@clerk/react";
import { useCallback } from "react";
import { apiRequest, type ApiClientError } from "./api";

export function useApi() {
  const { getToken } = useAuth();
  return useCallback(
    <T,>(path: string, options?: { method?: string; body?: unknown; signal?: AbortSignal }) =>
      apiRequest<T>(path, getToken, options),
    [getToken],
  );
}

export function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return "Something went wrong. Please try again.";
}

export function isApiError(error: unknown): error is ApiClientError {
  return error instanceof Error && error.name === "ApiClientError";
}
