import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { UserRole } from '@tma-shop/shared';

export interface SessionClaims {
  /** Telegram user id (subject). */
  sub: number;
  role: UserRole;
  shopId: string;
}

const ALG = 'HS256';

function secretBytes(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signSession(
  claims: SessionClaims,
  secret: string,
  ttlSeconds: number,
): Promise<{ token: string; expiresAt: Date }> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((issuedAt + ttlSeconds) * 1000);

  const token = await new SignJWT({ role: claims.role, shopId: claims.shopId })
    .setProtectedHeader({ alg: ALG })
    .setSubject(String(claims.sub))
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + ttlSeconds)
    .sign(secretBytes(secret));

  return { token, expiresAt };
}

export async function verifySession(token: string, secret: string): Promise<SessionClaims> {
  const { payload } = await jwtVerify(token, secretBytes(secret), { algorithms: [ALG] });
  return claimsFromPayload(payload);
}

function claimsFromPayload(payload: JWTPayload): SessionClaims {
  const sub = Number(payload.sub);
  const role = payload.role;
  const shopId = payload.shopId;
  if (
    !Number.isFinite(sub) ||
    (role !== 'customer' && role !== 'admin') ||
    typeof shopId !== 'string'
  ) {
    throw new Error('Malformed session token payload');
  }
  return { sub, role, shopId };
}
