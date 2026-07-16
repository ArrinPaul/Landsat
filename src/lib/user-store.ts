

import { getSupabase } from '@/lib/supabase';

export type UserPreferences = {
  language?: string;
  theme?: 'light' | 'dark' | 'system';
  reducedMotion?: boolean;
};

export type UserHistoryItem = {
  id: string;
  createdAt: string;
  kind: 'dashboard' | 'chat';
  payload: Record<string, unknown>;
};

const PREFS_TABLE = 'user_preferences';
const HISTORY_TABLE = 'user_history';

export async function saveUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(PREFS_TABLE)
    .upsert(
      {
        id: userId,
        preferences,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    
  if (error) {
    console.error('Supabase save error (user_preferences):', error);
  }
}

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(PREFS_TABLE)
    .select('preferences')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.preferences as UserPreferences;
}

export async function appendUserHistory(userId: string, item: UserHistoryItem): Promise<void> {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from(HISTORY_TABLE)
    .insert({
      id: item.id,
      user_id: userId,
      created_at: item.createdAt,
      kind: item.kind,
      payload: item.payload
    });
    
  if (error) {
    console.error('Supabase append error (user_history):', error);
  }
}

export async function listUserHistory(userId: string, limit = 20): Promise<UserHistoryItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(HISTORY_TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    createdAt: row.created_at,
    kind: row.kind,
    payload: row.payload,
  }));
}
