import { describe, expect, it, vi } from 'vitest';
import type { Order } from '@tma-shop/shared';
import type { Database } from '../db/client.js';
import { TelegramApi } from '../telegram/api.js';
import type { TelegramUpdate } from '../telegram/types.js';
import { buildStarsInvoiceParams, handlePaymentUpdate } from './payments.js';

const baseOrder: Order = {
  id: '00000000-0000-4000-8000-000000000abc',
  shopId: '00000000-0000-4000-8000-000000000001',
  userId: 706626062,
  status: 'pending',
  items: [
    { productId: 'p1', title: 'Tea', unitPrice: 50, quantity: 2, subtotal: 100 },
    { productId: 'p2', title: 'Cup', unitPrice: 25, quantity: 1, subtotal: 25 },
  ],
  total: 125,
  currency: 'XTR',
  paymentChargeId: null,
  createdAt: '2026-06-19T12:00:00.000Z',
  updatedAt: '2026-06-19T12:00:00.000Z',
};

describe('buildStarsInvoiceParams', () => {
  it('builds an XTR invoice with the total as a single price line', () => {
    const params = buildStarsInvoiceParams(baseOrder, 'Demo Shop');
    expect(params.currency).toBe('XTR');
    expect(params.providerToken).toBe('');
    expect(params.payload).toBe(baseOrder.id);
    expect(params.prices).toEqual([{ label: 'Total', amount: 125 }]);
    expect(params.description).toContain('2× Tea');
  });

  it('rejects a non-Stars currency', () => {
    expect(() => buildStarsInvoiceParams({ ...baseOrder, currency: 'USD' }, 'Demo')).toThrow();
  });
});

function fakeDbWithOrder(order: Order | undefined): Database {
  return {
    query: { orders: { findFirst: vi.fn().mockResolvedValue(order) } },
  } as unknown as Database;
}

describe('handlePaymentUpdate — pre_checkout_query', () => {
  const query: TelegramUpdate['pre_checkout_query'] = {
    id: 'pcq-1',
    from: { id: 706626062 },
    currency: 'XTR',
    total_amount: 125,
    invoice_payload: baseOrder.id,
  };

  it('confirms a payable order', async () => {
    const telegram = new TelegramApi('token');
    const answer = vi.spyOn(telegram, 'answerPreCheckoutQuery').mockResolvedValue(true);
    await handlePaymentUpdate(
      fakeDbWithOrder(baseOrder),
      'token',
      { update_id: 1, pre_checkout_query: query },
      telegram,
    );
    expect(answer).toHaveBeenCalledWith('pcq-1', true, undefined);
  });

  it('declines when the order is already paid', async () => {
    const telegram = new TelegramApi('token');
    const answer = vi.spyOn(telegram, 'answerPreCheckoutQuery').mockResolvedValue(true);
    await handlePaymentUpdate(
      fakeDbWithOrder({ ...baseOrder, status: 'paid' }),
      'token',
      { update_id: 1, pre_checkout_query: query },
      telegram,
    );
    expect(answer).toHaveBeenCalledWith('pcq-1', false, expect.any(String));
  });

  it('declines when the amount does not match the order total', async () => {
    const telegram = new TelegramApi('token');
    const answer = vi.spyOn(telegram, 'answerPreCheckoutQuery').mockResolvedValue(true);
    await handlePaymentUpdate(
      fakeDbWithOrder(baseOrder),
      'token',
      { update_id: 1, pre_checkout_query: { ...query, total_amount: 1 } },
      telegram,
    );
    expect(answer).toHaveBeenCalledWith('pcq-1', false, expect.any(String));
  });
});
