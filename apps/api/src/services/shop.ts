import { asc, eq } from 'drizzle-orm';
import type { ShopConfig } from '@tma-shop/shared';
import type { Database } from '../db/client.js';
import type { Env } from '../config/env.js';
import { shops } from '../db/schema.js';
import { toShopConfigDTO } from '../db/mappers.js';
import { ApiError } from '../lib/errors.js';

/**
 * Resolves the active shop id: the configured `SHOP_ID` when present, otherwise
 * the first (and, in a single-store deployment, only) shop in the database.
 */
export async function resolveActiveShopId(db: Database, env: Env): Promise<string> {
  if (env.SHOP_ID) return env.SHOP_ID;
  const shop = await db.query.shops.findFirst({ orderBy: asc(shops.createdAt) });
  if (!shop) {
    throw new ApiError(503, 'no_shop', 'No shop configured — run the seed script first');
  }
  return shop.id;
}

export async function getShopConfig(db: Database, shopId: string): Promise<ShopConfig> {
  const shop = await db.query.shops.findFirst({ where: eq(shops.id, shopId) });
  if (!shop) throw ApiError.notFound('Shop not found');
  return toShopConfigDTO(shop);
}
