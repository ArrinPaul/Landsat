import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/require-admin';
import { getSupabase } from '@/lib/supabase';
import { getProfile, recordAccountEvent } from '@/lib/profile-store';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['viewer', 'analyst', 'admin']).optional(),
  disabled: z.boolean().optional(),
  onboarding_completed: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;
  const { id } = await params;

  const supabase = getSupabase();
  const [{ data: user, error }, profile, { data: events }] = await Promise.all([
    supabase
      .from('users')
      .select('id, name, email, role, onboarding_completed, onboarding_step, disabled, created_at, last_login_at')
      .eq('id', id)
      .single(),
    getProfile(id),
    supabase
      .from('account_events')
      .select('id, event_type, metadata, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(25),
  ]);

  if (error || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user, profile, events: events ?? [] });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;
  const { auth } = guard;
  const { id } = await params;

  const body = await req.json();
  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  if (id === auth.userId && result.data.role && result.data.role !== 'admin') {
    return NextResponse.json({ error: 'You cannot remove your own admin role' }, { status: 400 });
  }
  if (id === auth.userId && result.data.disabled) {
    return NextResponse.json({ error: 'You cannot disable your own account' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('users')
    .update(result.data)
    .eq('id', id)
    .select('id, name, email, role, disabled')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }

  await recordAccountEvent(id, 'admin_updated_account', {
    changedBy: auth.userId,
    changes: result.data,
  });

  return NextResponse.json({ success: true, user: data });
}
