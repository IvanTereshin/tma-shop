import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { orderStatus, productInput, slug } from '@tma-shop/shared';
import type { AppBindings } from '../context.js';
import { requireAdmin, requireAuth } from '../auth/middleware.js';
import { createCategory, createProduct, deleteProduct, updateProduct } from '../services/admin.js';
import { listAllOrders, setOrderStatus } from '../services/orders.js';

const idParam = z.object({ id: z.uuid() });
const categoryInput = z.object({
  slug,
  title: z.string().min(1).max(128),
  sortOrder: z.number().int().default(0),
});
const statusInput = z.object({ status: orderStatus });

export function adminRoutes(): Hono<AppBindings> {
  const app = new Hono<AppBindings>();
  app.use('*', requireAuth, requireAdmin);

  // Products
  app.post('/products', zValidator('json', productInput), async (c) =>
    c.json(await createProduct(c.get('db'), c.get('shopId'), c.req.valid('json')), 201),
  );
  app.put(
    '/products/:id',
    zValidator('param', idParam),
    zValidator('json', productInput),
    async (c) =>
      c.json(
        await updateProduct(
          c.get('db'),
          c.get('shopId'),
          c.req.valid('param').id,
          c.req.valid('json'),
        ),
      ),
  );
  app.delete('/products/:id', zValidator('param', idParam), async (c) => {
    await deleteProduct(c.get('db'), c.get('shopId'), c.req.valid('param').id);
    return c.body(null, 204);
  });

  // Categories
  app.post('/categories', zValidator('json', categoryInput), async (c) =>
    c.json(await createCategory(c.get('db'), c.get('shopId'), c.req.valid('json')), 201),
  );

  // Orders
  app.get('/orders', async (c) => c.json(await listAllOrders(c.get('db'), c.get('shopId'))));
  app.patch(
    '/orders/:id',
    zValidator('param', idParam),
    zValidator('json', statusInput),
    async (c) =>
      c.json(
        await setOrderStatus(
          c.get('db'),
          c.get('shopId'),
          c.req.valid('param').id,
          c.req.valid('json').status,
        ),
      ),
  );

  return app;
}
