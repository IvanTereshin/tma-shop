import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { catalogQuery } from '@tma-shop/shared';
import type { AppBindings } from '../context.js';
import { getProductById, listCategories, listProducts } from '../services/catalog.js';
import { getShopConfig } from '../services/shop.js';
import { ApiError } from '../lib/errors.js';

const idParam = z.object({ id: z.uuid() });

export function catalogRoutes(): Hono<AppBindings> {
  const app = new Hono<AppBindings>();

  app.get('/shop', async (c) => c.json(await getShopConfig(c.get('db'), c.get('shopId'))));

  app.get('/categories', async (c) => c.json(await listCategories(c.get('db'), c.get('shopId'))));

  app.get('/products', zValidator('query', catalogQuery), async (c) => {
    const page = await listProducts(c.get('db'), c.get('shopId'), c.req.valid('query'));
    return c.json(page);
  });

  app.get('/products/:id', zValidator('param', idParam), async (c) => {
    const product = await getProductById(c.get('db'), c.get('shopId'), c.req.valid('param').id);
    if (!product) throw ApiError.notFound('Product not found');
    return c.json(product);
  });

  return app;
}
