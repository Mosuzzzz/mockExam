export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function notFound() {
  return new ApiError(404, "NOT_FOUND", "This item could not be found.");
}
