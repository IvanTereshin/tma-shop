import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppBindings, AppDeps } from './context.js';
import { ApiError, errorResponse } from './lib/errors.js';
import { withShop } from './middleware/shop.js';
import { authRoutes } from './routes/auth.js';
import { catalogRoutes } from './routes/catalog.js';
import { cartRoutes } from './routes/cart.js';
import { orderRoutes } from './routes/orders.js';
import { adminRoutes } from './routes/admin.js';
import { webhookRoutes } from './routes/webhook.js';

export function createApp(deps: AppDeps): Hono<AppBindings> {
  const app = new Hono<AppBindings>();

  // Inject shared dependencies into every request.
  app.use('*', async (c, next) => {
    c.set('env', deps.env);
    c.set('db', deps.db);
    await next();
  });

  const origin = deps.env.CORS_ORIGIN;
  app.use(
    '*',
    cors({
      origin: origin === '*' ? '*' : origin.split(',').map((o) => o.trim()),
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Authorization', 'Content-Type'],
    }),
  );

  app.onError((err, c) => {
    if (err instanceof ApiError) return errorResponse(c, err);
    console.error('Unhandled error:', err);
    return c.json({ error: { code: 'internal_error', message: 'Internal server error' } }, 500);
  });

  app.get('/health', (c) => c.json({ status: 'ok' }));

  // Telegram webhook is not shop-scoped (it reconciles by order id).
  app.route('/webhook', webhookRoutes());

  // All public + authenticated API routes resolve the active shop first.
  const api = new Hono<AppBindings>();
  api.use('*', withShop);
  api.route('/auth', authRoutes());
  api.route('/', catalogRoutes());
  api.route('/cart', cartRoutes());
  api.route('/orders', orderRoutes());
  api.route('/admin', adminRoutes());

  app.route('/api', api);

  return app;
}
