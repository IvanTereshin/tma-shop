import { z } from 'zod';
import { currencyCode, id, isoDateTime, moneyAmount, paginationQuery, slug } from './common.js';

export const category = z.object({
  id,
  shopId: id,
  slug,
  title: z.string().min(1).max(128),
  sortOrder: z.number().int(),
});
export type Category = z.infer<typeof category>;

export const product = z.object({
  id,
  shopId: id,
  categoryId: id.nullable(),
  slug,
  title: z.string().min(1).max(256),
  description: z.string().max(4096),
  /** Price in the shop currency's minor units (or whole Stars for XTR). */
  price: moneyAmount,
  currency: currencyCode,
  imageUrl: z.url().nullable(),
  /** `null` means the product is not stock-tracked (always available). */
  stock: z.number().int().nonnegative().nullable(),
  isActive: z.boolean(),
  createdAt: isoDateTime,
});
export type Product = z.infer<typeof product>;

export const catalogQuery = paginationQuery.extend({
  categoryId: id.optional(),
  search: z.string().trim().min(1).max(128).optional(),
});
export type CatalogQuery = z.infer<typeof catalogQuery>;

/** Payload accepted by the admin product create/update endpoints. */
export const productInput = product.omit({
  id: true,
  shopId: true,
  createdAt: true,
});
export type ProductInput = z.infer<typeof productInput>;
