import { createHmac } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Pool } from 'pg';
import { createApp } from '../app.js';
import type { Env } from '../config/env.js';
import { createDb, createPool, type Database } from '../db/client.js';
import { categories, products, shops } from '../db/schema.js';

/**
 * Full-stack integration test against a real Postgres. Skipped automatically
 * when TEST_DATABASE_URL is not set (e.g. a plain `npm test` with no database);
 * CI provides a Postgres service and sets the variable.
 */
const DATABASE_URL = process.env.TEST_DATABASE_URL;
const describeDb = DATABASE_URL ? describe : describe.skip;

const BOT_TOKEN = '7654321:AAFakeBotTokenForIntegration_0123456789';
const ADMIN_ID = 706626062;
const CUSTOMER_ID = 555000111;

function signInitData(userId: number, firstName: string): string {
  const fields: Record<string, string> = {
    user: JSON.stringify({ id: userId, first_name: firstName }),
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: 'AAItest',
  };
  const dcs = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const hash = createHmac('sha256', secret).update(dcs).digest('hex');
  return new URLSearchParams({ ...fields, hash }).toString();
}

describeDb('API integration', () => {
  let pool: Pool;
  let db: Database;
  let app: ReturnType<typeof createApp>;
  let shopId: string;
  let productId: string;

  beforeAll(async () => {
    pool = createPool(DATABASE_URL as string);
    db = createDb(pool);
    await migrate(db, { migrationsFolder: './drizzle' });

    // Clean slate, then seed one shop / category / product deterministically.
    await db.delete(shops);
    const [shop] = await db
      .insert(shops)
      .values({ name: 'Test Shop', description: '', currency: 'XTR', starsEnabled: true })
      .returning();
    shopId = shop!.id;
    const [cat] = await db
      .insert(categories)
      .values({ shopId, slug: 'tea', title: 'Tea', sortOrder: 1 })
      .returning();
    const [product] = await db
      .insert(products)
      .values({
        shopId,
        categoryId: cat!.id,
        slug: 'sencha',
        title: 'Sencha',
        description: 'Green tea',
        price: 150,
        currency: 'XTR',
        stock: 10,
        isActive: true,
      })
      .returning();
    productId = product!.id;

    const env: Env = {
      PORT: 0,
      DATABASE_URL: DATABASE_URL as string,
      BOT_TOKEN,
      JWT_SECRET: 'integration-secret-32-characters-long',
      JWT_TTL_SECONDS: 3600,
      INITDATA_MAX_AGE_SECONDS: 86_400,
      ADMIN_TELEGRAM_IDS: [ADMIN_ID],
      TELEGRAM_WEBHOOK_SECRET: 'whsec-test',
      SHOP_ID: shopId,
      CORS_ORIGIN: '*',
    };
    app = createApp({ env, db });
  });

  afterAll(async () => {
    await pool?.end();
  });

  async function authToken(userId: number, name: string): Promise<string> {
    const res = await app.request('/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ initData: signInitData(userId, name) }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string };
    return body.token;
  }

  it('rejects auth with tampered initData', async () => {
    const bad = signInitData(CUSTOMER_ID, 'Eve').replace('Eve', 'Mallory');
    const res = await app.request('/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ initData: bad }),
    });
    expect(res.status).toBe(401);
  });

  it('lists catalog publicly', async () => {
    const res = await app.request('/api/products');
    expect(res.status).toBe(200);
    const page = (await res.json()) as { items: unknown[]; total: number };
    expect(page.total).toBeGreaterThanOrEqual(1);
  });

  it('runs the cart → order → payment flow', async () => {
    const token = await authToken(CUSTOMER_ID, 'Alice');
    const auth = { Authorization: `Bearer ${token}`, 'content-type': 'application/json' };

    // Add to cart
    const add = await app.request('/api/cart/items', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ productId, quantity: 2 }),
    });
    expect(add.status).toBe(200);
    const cart = (await add.json()) as { total: number; itemCount: number };
    expect(cart.total).toBe(300);
    expect(cart.itemCount).toBe(2);

    // Create order
    const create = await app.request('/api/orders', { method: 'POST', headers: auth });
    expect(create.status).toBe(201);
    const { orderId } = (await create.json()) as { orderId: string };

    // Order is pending
    const before = await app.request(`/api/orders/${orderId}`, { headers: auth });
    expect(((await before.json()) as { status: string }).status).toBe('pending');

    // Telegram webhook confirms payment
    const hook = await app.request('/webhook/telegram', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Telegram-Bot-Api-Secret-Token': 'whsec-test',
      },
      body: JSON.stringify({
        update_id: 1,
        message: {
          successful_payment: {
            currency: 'XTR',
            total_amount: 300,
            invoice_payload: orderId,
            telegram_payment_charge_id: 'charge_abc',
          },
        },
      }),
    });
    expect(hook.status).toBe(200);

    // Order is now paid, stock decremented 10 → 8
    const after = await app.request(`/api/orders/${orderId}`, { headers: auth });
    expect(((await after.json()) as { status: string }).status).toBe('paid');
    const prod = await app.request(`/api/products/${productId}`);
    expect(((await prod.json()) as { stock: number }).stock).toBe(8);
  });

  it('rejects the webhook with a wrong secret', async () => {
    const res = await app.request('/webhook/telegram', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': 'wrong' },
      body: JSON.stringify({ update_id: 2 }),
    });
    expect(res.status).toBe(401);
  });

  it('enforces admin-only routes', async () => {
    const customer = await authToken(CUSTOMER_ID, 'Alice');
    const denied = await app.request('/api/admin/orders', {
      headers: { Authorization: `Bearer ${customer}` },
    });
    expect(denied.status).toBe(403);

    const admin = await authToken(ADMIN_ID, 'Ivan');
    const allowed = await app.request('/api/admin/orders', {
      headers: { Authorization: `Bearer ${admin}` },
    });
    expect(allowed.status).toBe(200);
  });
});
