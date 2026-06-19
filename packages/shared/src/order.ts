import { z } from 'zod';
import { currencyCode, id, isoDateTime, moneyAmount } from './common.js';
import { telegramUserId } from './user.js';

export const orderStatus = z.enum([
  'pending', // created, not yet paid
  'awaiting_payment', // invoice issued, waiting for Stars payment
  'paid', // payment confirmed
  'cancelled',
  'fulfilled',
]);
export type OrderStatus = z.infer<typeof orderStatus>;

/** Line item snapshot — title and price are frozen at order time. */
export const orderItem = z.object({
  productId: id,
  title: z.string().min(1).max(256),
  unitPrice: moneyAmount,
  quantity: z.number().int().positive(),
  subtotal: moneyAmount,
});
export type OrderItem = z.infer<typeof orderItem>;

export const order = z.object({
  id,
  shopId: id,
  userId: telegramUserId,
  status: orderStatus,
  items: z.array(orderItem).min(1),
  total: moneyAmount,
  currency: currencyCode,
  /** Telegram payment charge id once paid. */
  paymentChargeId: z.string().nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});
export type Order = z.infer<typeof order>;
