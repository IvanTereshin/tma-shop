import { and, eq } from 'drizzle-orm';
import type { Category, Product, ProductInput } from '@tma-shop/shared';
import type { Database } from '../db/client.js';
import { categories, products } from '../db/schema.js';
import { toCategoryDTO, toProductDTO } from '../db/mappers.js';
import { ApiError } from '../lib/errors.js';

export async function createProduct(
  db: Database,
  shopId: string,
  input: ProductInput,
): Promise<Product> {
  const [row] = await db
    .insert(products)
    .values({ shopId, ...input })
    .returning();
  if (!row) throw new Error('Failed to create product');
  return toProductDTO(row);
}

export async function updateProduct(
  db: Database,
  shopId: string,
  productId: string,
  input: ProductInput,
): Promise<Product> {
  const [row] = await db
    .update(products)
    .set({ ...input })
    .where(and(eq(products.shopId, shopId), eq(products.id, productId)))
    .returning();
  if (!row) throw ApiError.notFound('Product not found');
  return toProductDTO(row);
}

export async function deleteProduct(
  db: Database,
  shopId: string,
  productId: string,
): Promise<void> {
  const deleted = await db
    .delete(products)
    .where(and(eq(products.shopId, shopId), eq(products.id, productId)))
    .returning({ id: products.id });
  if (deleted.length === 0) throw ApiError.notFound('Product not found');
}

export async function createCategory(
  db: Database,
  shopId: string,
  input: { slug: string; title: string; sortOrder: number },
): Promise<Category> {
  const [row] = await db
    .insert(categories)
    .values({ shopId, ...input })
    .returning();
  if (!row) throw new Error('Failed to create category');
  return toCategoryDTO(row);
}
