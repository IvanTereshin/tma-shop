import { createDb, createPool } from './client.js';
import { categories, products, shops } from './schema.js';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://tma:tma@localhost:5432/tma_shop';

/**
 * Seeds a self-contained demo store. Re-running wipes existing shops (cascading
 * to categories/products/carts/orders) and recreates the demo data, so the seed
 * is safe to run repeatedly in development.
 */
async function main(): Promise<void> {
  const pool = createPool(DATABASE_URL);
  const db = createDb(pool);

  console.log('Resetting existing shops…');
  await db.delete(shops);

  const [shop] = await db
    .insert(shops)
    .values({
      name: 'Demo Tea Shop',
      description: 'A universal tma-shop demo storefront. Pay with Telegram Stars ⭐.',
      currency: 'XTR',
      botUsername: null,
      starsEnabled: true,
    })
    .returning();
  if (!shop) throw new Error('Failed to create demo shop');

  const [tea, accessories] = await db
    .insert(categories)
    .values([
      { shopId: shop.id, slug: 'tea', title: 'Tea', sortOrder: 1 },
      { shopId: shop.id, slug: 'accessories', title: 'Accessories', sortOrder: 2 },
    ])
    .returning();
  if (!tea || !accessories) throw new Error('Failed to create categories');

  await db.insert(products).values([
    {
      shopId: shop.id,
      categoryId: tea.id,
      slug: 'sencha-green',
      title: 'Sencha Green Tea',
      description: 'Bright, grassy Japanese green tea. 100g.',
      price: 150,
      currency: 'XTR',
      imageUrl: null,
      stock: 25,
      isActive: true,
    },
    {
      shopId: shop.id,
      categoryId: tea.id,
      slug: 'earl-grey',
      title: 'Earl Grey',
      description: 'Classic black tea with bergamot. 100g.',
      price: 120,
      currency: 'XTR',
      imageUrl: null,
      stock: 40,
      isActive: true,
    },
    {
      shopId: shop.id,
      categoryId: tea.id,
      slug: 'pu-erh-aged',
      title: 'Aged Pu-erh',
      description: 'Deep, earthy fermented tea, 5 years aged. 50g.',
      price: 300,
      currency: 'XTR',
      imageUrl: null,
      stock: null, // not stock-tracked
      isActive: true,
    },
    {
      shopId: shop.id,
      categoryId: accessories.id,
      slug: 'cast-iron-teapot',
      title: 'Cast Iron Teapot',
      description: 'Traditional tetsubin, 600ml.',
      price: 800,
      currency: 'XTR',
      imageUrl: null,
      stock: 8,
      isActive: true,
    },
    {
      shopId: shop.id,
      categoryId: accessories.id,
      slug: 'gaiwan',
      title: 'Porcelain Gaiwan',
      description: 'White porcelain gaiwan for gongfu brewing, 120ml.',
      price: 250,
      currency: 'XTR',
      imageUrl: null,
      stock: 15,
      isActive: true,
    },
  ]);

  console.log('Seed complete.');
  console.log(`\n  SHOP_ID=${shop.id}\n`);
  console.log('Set this SHOP_ID in apps/api/.env (optional for single-shop deployments).');

  await pool.end();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
