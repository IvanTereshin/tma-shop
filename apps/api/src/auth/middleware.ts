import { createMiddleware } from 'hono/factory';
import type { AppBindings } from '../context.js';
import { ApiError } from '../lib/errors.js';
import { verifySession } from './jwt.js';

/**
 * Requires a valid `Authorization: Bearer <jwt>` header and exposes the decoded
 * claims as `c.get('claims')`. Throws `ApiError(401)` otherwise.
 */
export const requireAuth = createMiddleware<AppBindings>(async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing bearer token');
  }
  const token = header.slice('Bearer '.length).trim();
  const env = c.get('env');
  try {
    const claims = await verifySession(token, env.JWT_SECRET);
    c.set('claims', claims);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
  await next();
});

/** Requires the authenticated user to hold the `admin` role. */
export const requireAdmin = createMiddleware<AppBindings>(async (c, next) => {
  const claims = c.get('claims');
  if (claims.role !== 'admin') {
    throw ApiError.forbidden('Admin role required');
  }
  await next();
});
