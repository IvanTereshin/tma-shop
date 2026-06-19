import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  BOT_TOKEN: z.string().min(1),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  INITDATA_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(86_400),
  ADMIN_TELEGRAM_IDS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => Number(part)),
    )
    .pipe(z.array(z.number().int().positive())),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1).default('dev-webhook-secret'),
  SHOP_ID: z.uuid().optional(),
  CORS_ORIGIN: z.string().default('*'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates `process.env` once at startup and returns a typed, frozen config.
 * Throws with a readable message if anything required is missing.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return Object.freeze(parsed.data);
}
