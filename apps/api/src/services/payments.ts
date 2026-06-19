import { eq } from 'drizzle-orm';
import type { Order } from '@tma-shop/shared';
import type { Database } from '../db/client.js';
import { orders, shops } from '../db/schema.js';
import { ApiError } from '../lib/errors.js';
import { TelegramApi, type CreateInvoiceLinkParams } from '../telegram/api.js';
import type { TelegramUpdate } from '../telegram/types.js';
import { getOrder, markOrderPaid, setOrderStatus } from './orders.js';

/**
 * Pure builder for the Stars invoice payload. With Telegram Stars the currency
 * is `XTR` and a single price line carries the whole-Star total; the order id
 * travels in `payload` so the webhook can reconcile the payment.
 */
export function buildStarsInvoiceParams(order: Order, shopName: string): CreateInvoiceLinkParams {
  if (order.currency !== 'XTR') {
    throw ApiError.badRequest('unsupported_currency', 'Stars checkout requires the XTR currency');
  }
  if (order.total <= 0) {
    throw ApiError.badRequest('invalid_total', 'Order total must be positive');
  }
  return {
    title: `${shopName} — order`,
    description: order.items
      .map((item) => `${item.quantity}× ${item.title}`)
      .join(', ')
      .slice(0, 255),
    payload: order.id,
    currency: 'XTR',
    prices: [{ label: 'Total', amount: order.total }],
    providerToken: '',
  };
}

/** Issues a Stars invoice link for an order and marks it awaiting payment. */
export async function createStarsInvoice(
  db: Database,
  botToken: string,
  shopId: string,
  orderId: string,
  userId: number,
  telegram = new TelegramApi(botToken),
): Promise<string> {
  const order = await getOrder(db, shopId, orderId, userId);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.status === 'paid' || order.status === 'fulfilled') {
    throw ApiError.conflict('already_paid', 'Order is already paid');
  }

  const shop = await db.query.shops.findFirst({ where: eq(shops.id, shopId) });
  if (!shop?.starsEnabled)
    throw ApiError.badRequest('stars_disabled', 'Stars payments are disabled');

  const link = await telegram.createInvoiceLink(buildStarsInvoiceParams(order, shop.name));
  await setOrderStatus(db, shopId, orderId, 'awaiting_payment');
  return link;
}

/**
 * Handles an incoming Telegram webhook update for the payment flow:
 *  - `pre_checkout_query`: confirm the order still exists and is payable.
 *  - `successful_payment`: mark the order paid (idempotent).
 */
export async function handlePaymentUpdate(
  db: Database,
  botToken: string,
  update: TelegramUpdate,
  telegram = new TelegramApi(botToken),
): Promise<void> {
  if (update.pre_checkout_query) {
    const query = update.pre_checkout_query;
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, query.invoice_payload),
    });
    const payable =
      order !== undefined &&
      order.total === query.total_amount &&
      order.status !== 'paid' &&
      order.status !== 'cancelled' &&
      order.status !== 'fulfilled';
    await telegram.answerPreCheckoutQuery(
      query.id,
      payable,
      payable ? undefined : 'This order can no longer be paid',
    );
    return;
  }

  const payment = update.message?.successful_payment;
  if (payment) {
    await markOrderPaid(db, payment.invoice_payload, payment.telegram_payment_charge_id);
  }
}
