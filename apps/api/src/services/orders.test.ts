import { describe, expect, it } from 'vitest';
import { ApiError } from '../lib/errors.js';
import { buildOrderDraft, type DraftLine } from './orders.js';

const line = (over: Partial<DraftLine> = {}): DraftLine => ({
  productId: 'p1',
  title: 'Tea',
  unitPrice: 50,
  quantity: 2,
  stock: null,
  ...over,
});

describe('buildOrderDraft', () => {
  it('prices line subtotals and the order total', () => {
    const draft = buildOrderDraft([
      line({ productId: 'p1', unitPrice: 50, quantity: 2 }),
      line({ productId: 'p2', title: 'Cup', unitPrice: 120, quantity: 1, stock: 10 }),
    ]);
    expect(draft.items[0]?.subtotal).toBe(100);
    expect(draft.items[1]?.subtotal).toBe(120);
    expect(draft.total).toBe(220);
  });

  it('rejects an empty cart', () => {
    expect(() => buildOrderDraft([])).toThrow(ApiError);
    try {
      buildOrderDraft([]);
    } catch (error) {
      expect((error as ApiError).code).toBe('empty_cart');
    }
  });

  it('rejects a line exceeding tracked stock', () => {
    try {
      buildOrderDraft([line({ quantity: 5, stock: 3 })]);
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe('out_of_stock');
    }
  });

  it('allows untracked stock (null) at any quantity', () => {
    const draft = buildOrderDraft([line({ quantity: 999, stock: null })]);
    expect(draft.total).toBe(50 * 999);
  });
});
