import { z } from 'zod';
import { currencyCode, id, moneyAmount } from './common.js';
import { product } from './catalog.js';

export const cartItemInput = z.object({
  productId: id,
  quantity: z.number().int().positive().max(999),
});
export type CartItemInput = z.infer<typeof cartItemInput>;

/** A cart line resolved against the current catalog, with computed subtotal. */
export const cartLine = z.object({
  product,
  quantity: z.number().int().positive(),
  subtotal: moneyAmount,
});
export type CartLine = z.infer<typeof cartLine>;

export const cart = z.object({
  lines: z.array(cartLine),
  currency: currencyCode,
  total: moneyAmount,
  itemCount: z.number().int().nonnegative(),
});
export type Cart = z.infer<typeof cart>;
