import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { CreateOrderResponse, InvoiceResponse } from '@tma-shop/shared';
import type { AppBindings } from '../context.js';
import { requireAuth } from '../auth/middleware.js';
import { createOrderFromCart, getOrder, listOrders } from '../services/orders.js';
import { createStarsInvoice } from '../services/payments.js';
import { ApiError } from '../lib/errors.js';

const idParam = z.object({ id: z.uuid() });

export function orderRoutes(): Hono<AppBindings> {
  const app = new Hono<AppBindings>();
  app.use('*', requireAuth);

  app.post('/', async (c) => {
    const { sub } = c.get('claims');
    const order = await createOrderFromCart(c.get('db'), c.get('shopId'), sub);
    const response: CreateOrderResponse = { orderId: order.id };
    return c.json(response, 201);
  });

  app.get('/', async (c) => {
    const { sub } = c.get('claims');
    return c.json(await listOrders(c.get('db'), c.get('shopId'), sub));
  });

  app.get('/:id', zValidator('param', idParam), async (c) => {
    const { sub } = c.get('claims');
    const order = await getOrder(c.get('db'), c.get('shopId'), c.req.valid('param').id, sub);
    if (!order) throw ApiError.notFound('Order not found');
    return c.json(order);
  });

  app.post('/:id/invoice', zValidator('param', idParam), async (c) => {
    const { sub } = c.get('claims');
    const env = c.get('env');
    const invoiceLink = await createStarsInvoice(
      c.get('db'),
      env.BOT_TOKEN,
      c.get('shopId'),
      c.req.valid('param').id,
      sub,
    );
    const response: InvoiceResponse = { invoiceLink };
    return c.json(response);
  });

  return app;
}
