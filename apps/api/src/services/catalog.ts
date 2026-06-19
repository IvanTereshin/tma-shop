import { and, asc, desc, eq, ilike, sql } from 'drizzle-orm';
import type { CatalogQuery, Category, Product } from '@tma-shop/shared';
import type { Database } from '../db/client.js';
import { categories, products } from '../db/schema.js';
import { toCategoryDTO, toProductDTO } from '../db/mappers.js';

export async function listCategories(db: Database, shopId: string): Promise<Category[]> {
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.shopId, shopId))
    .orderBy(asc(categories.sortOrder), asc(categories.title));
  return rows.map(toCategoryDTO);
}

export interface ProductPage {
  items: Product[];
  page: number;
  limit: number;
  total: number;
}

/** Lists active products with optional category filter, text search and paging. */
export async function listProducts(
  db: Database,
  shopId: string,
  query: CatalogQuery,
): Promise<ProductPage> {
  const filters = [eq(products.shopId, shopId), eq(products.isActive, true)];
  if (query.categoryId) filters.push(eq(products.categoryId, query.categoryId));
  if (query.search) filters.push(ilike(products.title, `%${query.search}%`));
  const where = and(...filters);

  const offset = (query.page - 1) * query.limit;
  const [rows, [counted]] = await Promise.all([
    db
      .select()
      .from(products)
      .where(where)
      .orderBy(desc(products.createdAt))
      .limit(query.limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(where),
  ]);

  return {
    items: rows.map(toProductDTO),
    page: query.page,
    limit: query.limit,
    total: counted?.count ?? 0,
  };
}

export async function getProductById(
  db: Database,
  shopId: string,
  productId: string,
): Promise<Product | undefined> {
  const row = await db.query.products.findFirst({
    where: and(eq(products.shopId, shopId), eq(products.id, productId)),
  });
  return row ? toProductDTO(row) : undefined;
}
