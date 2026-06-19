import { createMiddleware } from 'hono/factory';
import type { AppBindings } from '../context.js';
import { resolveActiveShopId } from '../services/shop.js';

/** Resolves the active shop once per request and exposes it as `c.get('shopId')`. */
export const withShop = createMiddleware<AppBindings>(async (c, next) => {
  const shopId = await resolveActiveShopId(c.get('db'), c.get('env'));
  c.set('shopId', shopId);
  await next();
});
