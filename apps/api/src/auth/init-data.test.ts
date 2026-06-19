import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { validateInitData, type InitDataUser } from './init-data.js';

const BOT_TOKEN = '7654321:AAFakeBotTokenForTestsOnly_0123456789';

/**
 * Independently re-implements the Telegram signing algorithm so the test does
 * not simply mirror the production code path. Builds the data-check-string from
 * decoded values, derives the secret key, and appends a valid `hash`.
 */
function signInitData(fields: Record<string, string>, token: string = BOT_TOKEN): string {
  const dataCheckString = Object.keys(fields)
    .filter((key) => key !== 'hash' && key !== 'signature')
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const params = new URLSearchParams({ ...fields, hash });
  return params.toString();
}

const demoUser: InitDataUser = {
  id: 706626062,
  first_name: 'Ivan',
  last_name: 'Tereshin',
  username: 'ivan',
  language_code: 'ru',
  is_premium: true,
};

function makeFields(authDateSeconds: number): Record<string, string> {
  return {
    user: JSON.stringify(demoUser),
    auth_date: String(authDateSeconds),
    query_id: 'AAEjdf83hf',
    chat_type: 'sender',
  };
}

describe('validateInitData', () => {
  const now = new Date('2026-06-19T12:00:00.000Z');
  const recent = Math.floor(now.getTime() / 1000) - 60;

  it('accepts correctly signed initData and parses the user', () => {
    const initData = signInitData(makeFields(recent));
    const result = validateInitData(initData, BOT_TOKEN, { maxAgeSeconds: 86_400, now });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.user?.id).toBe(706626062);
    expect(result.data.user?.first_name).toBe('Ivan');
    expect(result.data.user?.is_premium).toBe(true);
    expect(result.data.queryId).toBe('AAEjdf83hf');
    expect(result.data.authDate.getTime()).toBe(recent * 1000);
  });

  it('rejects initData signed with a different bot token', () => {
    const initData = signInitData(makeFields(recent), '111:WRONG_TOKEN');
    const result = validateInitData(initData, BOT_TOKEN, { now });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('sign-invalid');
  });

  it('rejects tampered data after signing', () => {
    const initData = signInitData(makeFields(recent));
    const tampered = initData.replace('Ivan', 'Mallory');
    const result = validateInitData(tampered, BOT_TOKEN, { now });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('sign-invalid');
  });

  it('reports missing hash', () => {
    const params = new URLSearchParams(makeFields(recent));
    const result = validateInitData(params.toString(), BOT_TOKEN, { now });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('missing-hash');
  });

  it('reports missing or non-numeric auth_date', () => {
    const fields = makeFields(recent);
    delete (fields as Record<string, string>).auth_date;
    const result = validateInitData(signInitData(fields), BOT_TOKEN, { now });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('missing-auth-date');
  });

  it('rejects expired initData when maxAge is set', () => {
    const old = Math.floor(now.getTime() / 1000) - 90_000; // ~25h ago
    const result = validateInitData(signInitData(makeFields(old)), BOT_TOKEN, {
      maxAgeSeconds: 86_400,
      now,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('expired');
  });

  it('accepts old initData when no maxAge is enforced', () => {
    const old = Math.floor(now.getTime() / 1000) - 90_000;
    const result = validateInitData(signInitData(makeFields(old)), BOT_TOKEN, { now });
    expect(result.ok).toBe(true);
  });

  it('treats an empty string as malformed', () => {
    const result = validateInitData('', BOT_TOKEN);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('malformed');
  });

  it('ignores the signature field in the HMAC check', () => {
    const fields = { ...makeFields(recent), signature: 'ed25519-third-party-signature' };
    const result = validateInitData(signInitData(fields), BOT_TOKEN, { now });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.signature).toBe('ed25519-third-party-signature');
  });

  it('rejects a hash of the wrong length without throwing', () => {
    const initData = signInitData(makeFields(recent)).replace(/hash=[a-f0-9]+/, 'hash=deadbeef');
    const result = validateInitData(initData, BOT_TOKEN, { now });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('sign-invalid');
  });
});
