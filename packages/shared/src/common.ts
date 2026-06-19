import { z } from 'zod';

/**
 * Monetary amounts are stored as integer amounts in the currency's minor units
 * (e.g. cents). For Telegram Stars (currency code `XTR`) one unit equals one Star
 * and amounts are whole numbers.
 */
export const moneyAmount = z.number().int().nonnegative();

/** ISO-4217 code, or `XTR` for Telegram Stars. */
export const currencyCode = z
  .string()
  .trim()
  .min(3)
  .max(8)
  .regex(/^[A-Z]+$/, 'Currency must be an uppercase code such as USD or XTR');

export const id = z.uuid();

export const slug = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be kebab-case');

export const isoDateTime = z.iso.datetime();

export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuery>;

export const paginated = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  });
