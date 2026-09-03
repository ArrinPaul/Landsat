import { getSupabase } from '@/lib/supabase';

export type Profile = {
  userId: string;
  phone: string | null;
  locationState: string | null;
  locationDistrict: string | null;
  farmSizeAcres: number | null;
  primaryCrops: string[];
  farmingExperienceYears: number | null;
  preferredLanguage: string;
  irrigationType: string | null;
  goals: string[];
  avatarUrl: string | null;
};

export type ProfileInput = Partial<Omit<Profile, 'userId'>>;

const COLUMN_MAP: Record<keyof ProfileInput, string> = {
  phone: 'phone',
  locationState: 'location_state',
  locationDistrict: 'location_district',
  farmSizeAcres: 'farm_size_acres',
  primaryCrops: 'primary_crops',
  farmingExperienceYears: 'farming_experience_years',
  preferredLanguage: 'preferred_language',
  irrigationType: 'irrigation_type',
  goals: 'goals',
  avatarUrl: 'avatar_url',
};

function toProfile(row: any): Profile {
  return {
    userId: row.user_id,
    phone: row.phone,
    locationState: row.location_state,
    locationDistrict: row.location_district,
    farmSizeAcres: row.farm_size_acres,
    primaryCrops: row.primary_crops ?? [],
    farmingExperienceYears: row.farming_experience_years,
    preferredLanguage: row.preferred_language ?? 'en',
    irrigationType: row.irrigation_type,
    goals: row.goals ?? [],
    avatarUrl: row.avatar_url,
  };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
  if (error || !data) {
    return null;
  }
  return toProfile(data);
}

export async function upsertProfile(userId: string, input: ProfileInput): Promise<Profile> {
  const supabase = getSupabase();
  const row: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
  for (const key of Object.keys(input) as (keyof ProfileInput)[]) {
    row[COLUMN_MAP[key]] = input[key];
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(row, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to save profile');
  }

  return toProfile(data);
}

export async function getOnboardingState(
  userId: string
): Promise<{ completed: boolean; step: number }> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('onboarding_completed, onboarding_step')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return { completed: false, step: 0 };
  }

  return { completed: data.onboarding_completed, step: data.onboarding_step };
}

export async function setOnboardingState(
  userId: string,
  state: { completed?: boolean; step?: number }
): Promise<void> {
  const supabase = getSupabase();
  const update: Record<string, unknown> = {};
  if (state.completed !== undefined) update.onboarding_completed = state.completed;
  if (state.step !== undefined) update.onboarding_step = state.step;

  const { error } = await supabase.from('users').update(update).eq('id', userId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function recordAccountEvent(
  userId: string,
  eventType: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('account_events').insert({
    user_id: userId,
    event_type: eventType,
    metadata,
  });
  if (error) {
    console.error('Failed to record account event:', error);
  }
}
