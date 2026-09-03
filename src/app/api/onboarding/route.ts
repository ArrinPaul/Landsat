import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/lib/auth';
import {
  getOnboardingState,
  getProfile,
  setOnboardingState,
  upsertProfile,
} from '@/lib/profile-store';

const profileSchema = z.object({
  phone: z.string().optional(),
  locationState: z.string().optional(),
  locationDistrict: z.string().optional(),
  farmSizeAcres: z.coerce.number().positive().optional(),
  primaryCrops: z.array(z.string()).optional(),
  farmingExperienceYears: z.coerce.number().min(0).optional(),
  preferredLanguage: z.string().optional(),
  irrigationType: z.string().optional(),
  goals: z.array(z.string()).optional(),
});

const saveSchema = z.object({
  step: z.number().int().min(0),
  data: profileSchema,
  complete: z.boolean().optional(),
});

export async function GET() {
  const auth = await getAuthContext();
  if (auth.userId === 'anonymous') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [state, profile] = await Promise.all([
    getOnboardingState(auth.userId),
    getProfile(auth.userId),
  ]);

  return NextResponse.json({ ...state, profile });
}

export async function POST(req: Request) {
  const auth = await getAuthContext();
  if (auth.userId === 'anonymous') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const result = saveSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 });
  }

  const { step, data, complete } = result.data;

  try {
    await upsertProfile(auth.userId, data);
    await setOnboardingState(auth.userId, { step, completed: complete ?? false });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Onboarding save error:', err);
    return NextResponse.json({ error: 'Failed to save onboarding data' }, { status: 500 });
  }
}
