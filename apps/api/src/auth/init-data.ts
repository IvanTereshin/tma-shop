import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Telegram Mini App user, as embedded (JSON-encoded) in the `user` field of
 * `initData`. Field names follow the Bot API (snake_case).
 */
export interface InitDataUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
  allows_write_to_pm?: boolean;
}

export interface ParsedInitData {
  user?: InitDataUser;
  authDate: Date;
  queryId?: string;
  startParam?: string;
  chatType?: string;
  chatInstance?: string;
  /** Ed25519 signature for third-party validation (not used by HMAC check). */
  signature?: string;
  hash: string;
  /** The original, unmodified initData string. */
  raw: string;
}

export type InitDataErrorCode =
  | 'malformed'
  | 'missing-hash'
  | 'missing-auth-date'
  | 'sign-invalid'
  | 'expired';

export class InitDataError extends Error {
  constructor(
    public readonly code: InitDataErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'InitDataError';
  }
}

export type ValidateResult =
  | { ok: true; data: ParsedInitData }
  | { ok: false; error: InitDataError };

export interface ValidateOptions {
  /** Reject initData whose `auth_date` is older than this many seconds. */
  maxAgeSeconds?: number;
  /** Injectable clock for deterministic testing. Defaults to `new Date()`. */
  now?: Date;
}

/**
 * Derives the Telegram secret key: `HMAC_SHA256(key="WebAppData", msg=botToken)`.
 * The bot token is the *message* and the literal string `WebAppData` is the key.
 */
function deriveSecretKey(botToken: string): Buffer {
  return createHmac('sha256', 'WebAppData').update(botToken).digest();
}

/**
 * Builds the data-check-string: every field except `hash` and `signature`,
 * sorted alphabetically by key, formatted as `key=value`, joined by newlines.
 * Values are the URL-decoded ones (as produced by `URLSearchParams`).
 *
 * `signature` is excluded because it belongs to Telegram's separate Ed25519
 * third-party validation flow and is not part of the HMAC check string used by
 * current Telegram clients.
 */
function buildDataCheckString(params: URLSearchParams): string {
  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === 'hash' || key === 'signature') continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  return pairs.join('\n');
}

function hexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

function parseUser(raw: string | null): InitDataUser | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as { id?: unknown }).id === 'number' &&
      typeof (parsed as { first_name?: unknown }).first_name === 'string'
    ) {
      return parsed as InitDataUser;
    }
  } catch {
    /* fall through */
  }
  return undefined;
}

/**
 * Validates Telegram Mini App `initData` against the bot token and returns the
 * parsed payload. Never throws — inspect the discriminated result.
 *
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(
  initDataRaw: string,
  botToken: string,
  options: ValidateOptions = {},
): ValidateResult {
  if (typeof initDataRaw !== 'string' || initDataRaw.length === 0) {
    return err('malformed', 'initData is empty');
  }

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initDataRaw);
  } catch {
    return err('malformed', 'initData is not a valid query string');
  }

  const hash = params.get('hash');
  if (!hash) {
    return err('missing-hash', 'initData has no hash field');
  }

  const authDateRaw = params.get('auth_date');
  if (!authDateRaw || !/^\d+$/.test(authDateRaw)) {
    return err('missing-auth-date', 'initData has no valid auth_date field');
  }

  const dataCheckString = buildDataCheckString(params);
  const secretKey = deriveSecretKey(botToken);
  const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (!hexEqual(computedHash, hash)) {
    return err('sign-invalid', 'initData hash does not match');
  }

  const authDate = new Date(Number(authDateRaw) * 1000);
  const maxAgeSeconds = options.maxAgeSeconds;
  if (maxAgeSeconds !== undefined) {
    const now = options.now ?? new Date();
    const ageSeconds = (now.getTime() - authDate.getTime()) / 1000;
    if (ageSeconds > maxAgeSeconds) {
      return err(
        'expired',
        `initData is older than ${maxAgeSeconds}s (age ${Math.round(ageSeconds)}s)`,
      );
    }
  }

  const data: ParsedInitData = { authDate, hash, raw: initDataRaw };
  const user = parseUser(params.get('user'));
  if (user) data.user = user;
  assignIfPresent(data, 'queryId', params.get('query_id'));
  assignIfPresent(data, 'startParam', params.get('start_param'));
  assignIfPresent(data, 'chatType', params.get('chat_type'));
  assignIfPresent(data, 'chatInstance', params.get('chat_instance'));
  assignIfPresent(data, 'signature', params.get('signature'));

  return { ok: true, data };
}

function err(code: InitDataErrorCode, message: string): ValidateResult {
  return { ok: false, error: new InitDataError(code, message) };
}

/** Assigns a string-valued optional field only when the source value is present. */
function assignIfPresent<K extends keyof ParsedInitData>(
  target: ParsedInitData,
  key: K,
  value: string | null,
): void {
  if (value !== null) {
    target[key] = value as ParsedInitData[K];
  }
}
