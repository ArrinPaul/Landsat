import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getAuthContext } from '@/lib/auth';
import { recordAccountEvent } from '@/lib/profile-store';
import { signSession, SESSION_COOKIE } from '@/lib/jwt';
import { getSupabase } from '@/lib/supabase';

const emailUpdateSchema = z.object({
  newEmail: z.string().email(),
  currentPassword: z.string().min(1),
});

export async function PATCH(req: Request) {
  const auth = await getAuthContext();
  if (auth.userId === 'anonymous') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const result = emailUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  const { newEmail, currentPassword } = result.data;

  const supabase = getSupabase();

  const { data: user } = await supabase
    .from('users')
    .select('id, password_hash, role')
    .eq('id', auth.userId)
    .single();

  if (!user || !user.password_hash) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', newEmail)
    .single();
  if (existing && existing.id !== auth.userId) {
    return NextResponse.json({ error: 'That email is already in use' }, { status: 409 });
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ email: newEmail })
    .eq('id', auth.userId);
  if (updateError) {
    return NextResponse.json({ error: 'Failed to update email' }, { status: 500 });
  }

  await recordAccountEvent(auth.userId, 'email_changed', {});

  const token = await signSession({ userId: user.id, email: newEmail, role: user.role });
  const response = NextResponse.json({ success: true, email: newEmail });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
  return response;
}
