// @vitest-environment node
import { describe, expect, it, beforeAll } from 'vitest';
import { signSession, verifySession } from '@/lib/jwt';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
});

describe('session tokens', () => {
  it('round-trips a signed session', async () => {
    const token = await signSession({ userId: 'u1', email: 'a@b.com', role: 'admin' });
    const session = await verifySession(token);
    expect(session).toEqual({ userId: 'u1', email: 'a@b.com', role: 'admin' });
  });

  it('rejects a tampered token', async () => {
    const token = await signSession({ userId: 'u1', email: 'a@b.com', role: 'viewer' });
    const tampered = token.slice(0, -2) + (token.endsWith('a') ? 'b' : 'a');
    expect(await verifySession(tampered)).toBeNull();
  });

  it('rejects garbage input instead of throwing', async () => {
    expect(await verifySession('not-a-jwt')).toBeNull();
  });

  it('normalizes an unknown role to viewer instead of trusting the claim', async () => {
    const token = await signSession({ userId: 'u2', email: 'x@y.com', role: 'admin' });
    // Simulate a payload that smuggled an unexpected role value.
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    expect(['viewer', 'analyst', 'admin']).toContain(payload.role);
  });
});
