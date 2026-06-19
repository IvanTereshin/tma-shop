import { and, eq } from 'drizzle-orm';
import type { Cart, CartLine } from '@tma-shop/shared';
import type { Database } from '../db/client.js';
import { cartItems, carts, products, shops } from '../db/schema.js';
import { toProductDTO } from '../db/mappers.js';
import { ApiError } from '../lib/errors.js';

type CartRow = typeof carts.$inferSelect;
type ProductRow = typeof products.$inferSelect;

async function getOrCreateCart(db: Database, shopId: string, userId: number): Promise<CartRow> {
  const existing = await db.query.carts.findFirst({
    where: and(eq(carts.shopId, shopId), eq(carts.userId, userId)),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(carts)
    .values({ shopId, userId })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  // Lost a race — fetch the row created by the concurrent request.
  const row = await db.query.carts.findFirst({
    where: and(eq(carts.shopId, shopId), eq(carts.userId, userId)),
  });
  if (!row) throw new Error('Failed to create cart');
  return row;
}

async function loadProductForShop(
  db: Database,
  shopId: string,
  productId: string,
): Promise<ProductRow> {
  const product = await db.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.shopId, shopId)),
  });
  if (!product || !product.isActive) {
    throw ApiError.notFound('Product not found');
  }
  return product;
}

function assertStock(product: ProductRow, requestedQty: number): void {
  if (product.stock !== null && requestedQty > product.stock) {
    throw ApiError.conflict('out_of_stock', `Only ${product.stock} of "${product.title}" in stock`);
  }
}

export async function getCart(db: Database, shopId: string, userId: number): Promise<Cart> {
  const cart = await getOrCreateCart(db, shopId, userId);
  const [shop, rows] = await Promise.all([
    db.query.shops.findFirst({ where: eq(shops.id, shopId) }),
    db
      .select({ item: cartItems, product: products })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.cartId, cart.id)),
  ]);

  const lines: CartLine[] = rows
    .filter((r) => r.product.isActive)
    .map((r) => ({
      product: toProductDTO(r.product),
      quantity: r.item.quantity,
      subtotal: r.product.price * r.item.quantity,
    }));

  return {
    lines,
    currency: shop?.currency ?? 'XTR',
    total: lines.reduce((sum, line) => sum + line.subtotal, 0),
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}

export async function addItem(
  db: Database,
  shopId: string,
  userId: number,
  productId: string,
  quantity: number,
): Promise<Cart> {
  const cart = await getOrCreateCart(db, shopId, userId);
  const product = await loadProductForShop(db, shopId, productId);

  const existing = await db.query.cartItems.findFirst({
    where: and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)),
  });
  const newQty = (existing?.quantity ?? 0) + quantity;
  assertStock(product, newQty);

  await db
    .insert(cartItems)
    .values({ cartId: cart.id, productId, quantity: newQty })
    .onConflictDoUpdate({
      target: [cartItems.cartId, cartItems.productId],
      set: { quantity: newQty },
    });
  await touchCart(db, cart.id);

  return getCart(db, shopId, userId);
}

export async function setItemQuantity(
  db: Database,
  shopId: string,
  userId: number,
  productId: string,
  quantity: number,
): Promise<Cart> {
  const cart = await getOrCreateCart(db, shopId, userId);

  if (quantity === 0) {
    await db
      .delete(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)));
  } else {
    const product = await loadProductForShop(db, shopId, productId);
    assertStock(product, quantity);
    const updated = await db
      .update(cartItems)
      .set({ quantity })
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)))
      .returning();
    if (updated.length === 0) {
      throw ApiError.notFound('Item is not in the cart');
    }
  }
  await touchCart(db, cart.id);
  return getCart(db, shopId, userId);
}

export async function clearCartItems(db: Database, cartId: string): Promise<void> {
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
}

async function touchCart(db: Database, cartId: string): Promise<void> {
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));
}

export { getOrCreateCart };
