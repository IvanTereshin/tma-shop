import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/** Application error carrying an HTTP status and a stable machine-readable code. */
export class ApiError extends Error {
  constructor(
    public readonly status: ContentfulStatusCode,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(code: string, message: string): ApiError {
    return new ApiError(400, code, message);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, 'unauthorized', message);
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, 'forbidden', message);
  }

  static notFound(message = 'Not found'): ApiError {
    return new ApiError(404, 'not_found', message);
  }

  static conflict(code: string, message: string): ApiError {
    return new ApiError(409, code, message);
  }
}

export function errorResponse(c: Context, error: ApiError) {
  return c.json({ error: { code: error.code, message: error.message } }, error.status);
}
