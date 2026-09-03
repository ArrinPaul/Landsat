import { NextResponse } from 'next/server';
import { getAuthContext, type AuthContext } from '@/lib/auth';

export async function requireAdmin(): Promise<{ auth: AuthContext } | { response: NextResponse }> {
  const auth = await getAuthContext();
  if (auth.role !== 'admin') {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { auth };
}
