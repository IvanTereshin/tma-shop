import { Hono } from 'hono';
import type { AppBindings } from '../context.js';
import type { TelegramUpdate } from '../telegram/types.js';
import { handlePaymentUpdate } from '../services/payments.js';
import { ApiError } from '../lib/errors.js';

/**
 * Telegram webhook endpoint. Telegram authenticates itself with the secret token
 * configured via `setWebhook`, sent in the `X-Telegram-Bot-Api-Secret-Token`
 * header. We always answer 200 quickly so Telegram does not retry on app errors.
 */
export function webhookRoutes(): Hono<AppBindings> {
  const app = new Hono<AppBindings>();

  app.post('/telegram', async (c) => {
    const env = c.get('env');
    const secret = c.req.header('X-Telegram-Bot-Api-Secret-Token');
    if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      throw ApiError.unauthorized('Invalid webhook secret');
    }

    const update = (await c.req.json()) as TelegramUpdate;
    try {
      await handlePaymentUpdate(c.get('db'), env.BOT_TOKEN, update);
    } catch (error) {
      // Log and still acknowledge: a 5xx makes Telegram retry the same update.
      console.error('Webhook handling error:', error);
    }
    return c.json({ ok: true });
  });

  return app;
}
