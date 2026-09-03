import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getAuthContext } from '@/lib/auth';
import { recordAccountEvent } from '@/lib/profile-store';
import { getSupabase } from '@/lib/supabase';

const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function PATCH(req: Request) {
  const auth = await getAuthContext();
  if (auth.userId === 'anonymous') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const result = passwordUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  const { currentPassword, newPassword } = result.data;

  const supabase = getSupabase();

  const { data: user } = await supabase
    .from('users')
    .select('id, password_hash')
    .eq('id', auth.userId)
    .single();

  if (!user || !user.password_hash) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash: newHash })
    .eq('id', auth.userId);
  if (updateError) {
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }

  await recordAccountEvent(auth.userId, 'password_changed', {});

  return NextResponse.json({ success: true });
}
