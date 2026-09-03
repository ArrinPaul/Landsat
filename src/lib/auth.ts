import { cookies, headers } from 'next/headers';
import { SESSION_COOKIE, verifySession } from '@/lib/jwt';

export type UserRole = 'viewer' | 'analyst' | 'admin';

export type AuthContext = {
  userId: string;
  email: string | null;
  role: UserRole;
  ip: string;
};

export async function getAuthContext(): Promise<AuthContext> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  const session = token ? await verifySession(token) : null;

  const authRequired = process.env.AUTH_REQUIRED === 'true';
  if (authRequired && !session) {
    throw new Error('Unauthorized: missing or invalid session.');
  }

  const ipHeader = headerStore.get('x-forwarded-for');
  const ip = (ipHeader || '0.0.0.0').split(',')[0]?.trim() || '0.0.0.0';

  if (!session) {
    return { userId: 'anonymous', email: null, role: 'viewer', ip };
  }

  return { userId: session.userId, email: session.email, role: session.role, ip };
}

export function requireRole(context: AuthContext, allowedRoles: UserRole[]): void {
  if (!allowedRoles.includes(context.role)) {
    throw new Error(`Forbidden: role '${context.role}' is not allowed for this action.`);
  }
}
