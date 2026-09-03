import * as jose from 'jose';

export type SessionPayload = {
  userId: string;
  email: string;
  role: 'viewer' | 'analyst' | 'admin';
};

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET is missing or too short. Set a random string of at least 32 characters in your environment.'
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, getSecretKey());
    const { userId, email, role } = payload as Record<string, unknown>;
    if (typeof userId !== 'string' || typeof email !== 'string') {
      return null;
    }
    const normalizedRole = role === 'admin' || role === 'analyst' ? role : 'viewer';
    return { userId, email, role: normalizedRole };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = 'auth-token';
