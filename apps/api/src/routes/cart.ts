import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { addToCartRequest, updateCartItemRequest } from '@tma-shop/shared';
import type { AppBindings } from '../context.js';
import { requireAuth } from '../auth/middleware.js';
import { addItem, getCart, setItemQuantity } from '../services/cart.js';

const productIdParam = z.object({ productId: z.uuid() });

export function cartRoutes(): Hono<AppBindings> {
  const app = new Hono<AppBindings>();
  app.use('*', requireAuth);

  app.get('/', async (c) => {
    const { sub } = c.get('claims');
    return c.json(await getCart(c.get('db'), c.get('shopId'), sub));
  });

  app.post('/items', zValidator('json', addToCartRequest), async (c) => {
    const { sub } = c.get('claims');
    const { productId, quantity } = c.req.valid('json');
    return c.json(await addItem(c.get('db'), c.get('shopId'), sub, productId, quantity));
  });

  app.patch(
    '/items/:productId',
    zValidator('param', productIdParam),
    zValidator('json', updateCartItemRequest),
    async (c) => {
      const { sub } = c.get('claims');
      const { productId } = c.req.valid('param');
      const { quantity } = c.req.valid('json');
      return c.json(await setItemQuantity(c.get('db'), c.get('shopId'), sub, productId, quantity));
    },
  );

  app.delete('/items/:productId', zValidator('param', productIdParam), async (c) => {
    const { sub } = c.get('claims');
    const { productId } = c.req.valid('param');
    return c.json(await setItemQuantity(c.get('db'), c.get('shopId'), sub, productId, 0));
  });

  return app;
}
