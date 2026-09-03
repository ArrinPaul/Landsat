import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-admin';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const supabase = getSupabase();

  const [{ count: totalUsers }, { count: onboardedUsers }, { count: adminCount }, { data: recentUsers }] =
    await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('onboarding_completed', true),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
      supabase.from('users').select('created_at').order('created_at', { ascending: false }).limit(500),
    ]);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dayBuckets = new Map<string, number>();
  for (const row of recentUsers ?? []) {
    const date = new Date(row.created_at);
    if (date < thirtyDaysAgo) continue;
    const key = date.toISOString().slice(0, 10);
    dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
  }

  const registrationsByDay = Array.from(dayBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const newLast7Days = (recentUsers ?? []).filter((row) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(row.created_at) >= sevenDaysAgo;
  }).length;

  const total = totalUsers ?? 0;
  const onboarded = onboardedUsers ?? 0;

  return NextResponse.json({
    totalUsers: total,
    onboardedUsers: onboarded,
    incompleteOnboarding: Math.max(total - onboarded, 0),
    onboardingCompletionRate: total > 0 ? Math.round((onboarded / total) * 100) : 0,
    adminCount: adminCount ?? 0,
    newLast7Days,
    registrationsByDay,
  });
}
