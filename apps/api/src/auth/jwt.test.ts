import { describe, expect, it } from 'vitest';
import { signSession, verifySession } from './jwt.js';

const SECRET = 'test-secret-at-least-16-chars-long';

describe('session JWT', () => {
  it('round-trips claims through sign and verify', async () => {
    const { token, expiresAt } = await signSession(
      { sub: 706626062, role: 'admin', shopId: 'shop-1' },
      SECRET,
      3600,
    );
    expect(token.split('.')).toHaveLength(3);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    const claims = await verifySession(token, SECRET);
    expect(claims).toEqual({ sub: 706626062, role: 'admin', shopId: 'shop-1' });
  });

  it('rejects a token signed with a different secret', async () => {
    const { token } = await signSession({ sub: 1, role: 'customer', shopId: 's' }, SECRET, 3600);
    await expect(verifySession(token, 'another-secret-16chars')).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    const { token } = await signSession({ sub: 1, role: 'customer', shopId: 's' }, SECRET, -1);
    await expect(verifySession(token, SECRET)).rejects.toThrow();
  });
});
