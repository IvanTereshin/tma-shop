import { describe, expect, it } from 'vitest';
import { catalogQuery, currencyCode, product, slug } from './index.js';

describe('common schemas', () => {
  it('accepts kebab-case slugs and rejects others', () => {
    expect(slug.parse('hookah-bowl-2')).toBe('hookah-bowl-2');
    expect(slug.safeParse('Not Valid').success).toBe(false);
    expect(slug.safeParse('trailing-').success).toBe(false);
  });

  it('accepts uppercase currency codes including Stars', () => {
    expect(currencyCode.parse('USD')).toBe('USD');
    expect(currencyCode.parse('XTR')).toBe('XTR');
    expect(currencyCode.safeParse('usd').success).toBe(false);
  });
});

describe('catalogQuery', () => {
  it('applies pagination defaults and coerces query strings', () => {
    const parsed = catalogQuery.parse({ search: 'tea' });
    expect(parsed).toMatchObject({ page: 1, limit: 20, search: 'tea' });
  });

  it('coerces numeric strings from the query string', () => {
    const parsed = catalogQuery.parse({ page: '3', limit: '50' });
    expect(parsed.page).toBe(3);
    expect(parsed.limit).toBe(50);
  });

  it('rejects an over-large page size', () => {
    expect(catalogQuery.safeParse({ limit: '1000' }).success).toBe(false);
  });
});

describe('product', () => {
  it('rejects a negative price', () => {
    const base = {
      id: '00000000-0000-4000-8000-000000000000',
      shopId: '00000000-0000-4000-8000-000000000001',
      categoryId: null,
      slug: 'demo',
      title: 'Demo',
      description: '',
      price: -1,
      currency: 'XTR',
      imageUrl: null,
      stock: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    expect(product.safeParse(base).success).toBe(false);
  });
});
