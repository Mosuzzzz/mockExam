export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const headers = new Headers({ Accept: "application/json" });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");

  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });
  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string; details?: unknown }
    | null;

  if (!response.ok) {
    throw new ApiClientError(
      payload?.message ?? "The request could not be completed. Check your connection and try again.",
      response.status,
      payload?.error ?? "REQUEST_FAILED",
      payload?.details,
    );
  }
  return payload as T;
}
