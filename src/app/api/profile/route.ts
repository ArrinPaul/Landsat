import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/lib/auth';
import { getProfile, recordAccountEvent, upsertProfile } from '@/lib/profile-store';
import { getSupabase } from '@/lib/supabase';

const profileUpdateSchema = z.object({
  phone: z.string().optional(),
  locationState: z.string().min(1).optional(),
  locationDistrict: z.string().min(1).optional(),
  farmSizeAcres: z.coerce.number().positive().optional(),
  primaryCrops: z.array(z.string()).optional(),
  farmingExperienceYears: z.coerce.number().min(0).optional(),
  preferredLanguage: z.string().optional(),
  irrigationType: z.string().optional(),
  goals: z.array(z.string()).optional(),
});

export async function GET() {
  const auth = await getAuthContext();
  if (auth.userId === 'anonymous') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const [{ data: user }, profile] = await Promise.all([
    supabase.from('users').select('id, name, email, created_at').eq('id', auth.userId).single(),
    getProfile(auth.userId),
  ]);

  return NextResponse.json({ user, profile });
}

export async function PATCH(req: Request) {
  const auth = await getAuthContext();
  if (auth.userId === 'anonymous') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const result = profileUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 });
  }

  try {
    const profile = await upsertProfile(auth.userId, result.data);
    await recordAccountEvent(auth.userId, 'profile_updated', { fields: Object.keys(result.data) });
    return NextResponse.json({ success: true, profile });
  } catch (err: any) {
    console.error('Profile update error:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
