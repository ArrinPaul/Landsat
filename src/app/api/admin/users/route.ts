import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-admin';
import { getSupabase } from '@/lib/supabase';

const PAGE_SIZE = 20;

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const url = new URL(req.url);
  const search = url.searchParams.get('search')?.trim() ?? '';
  const role = url.searchParams.get('role') ?? '';
  const onboarding = url.searchParams.get('onboarding') ?? '';
  const page = Math.max(Number(url.searchParams.get('page') ?? '1'), 1);

  const supabase = getSupabase();
  let query = supabase
    .from('users')
    .select('id, name, email, role, onboarding_completed, disabled, created_at, last_login_at', {
      count: 'exact',
    });

  if (search) {
    // PostgREST's .or() takes a raw filter string, so strip characters that carry
    // syntactic meaning there (`,`, `(`, `)`) to prevent filter injection.
    const safeSearch = search.replace(/[,()]/g, '').slice(0, 100);
    if (safeSearch) {
      query = query.or(`name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
    }
  }
  if (role && ['viewer', 'analyst', 'admin'].includes(role)) {
    query = query.eq('role', role);
  }
  if (onboarding === 'complete') {
    query = query.eq('onboarding_completed', true);
  } else if (onboarding === 'incomplete') {
    query = query.eq('onboarding_completed', false);
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (error) {
    console.error('Admin user list error:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }

  return NextResponse.json({
    users: data ?? [],
    page,
    pageSize: PAGE_SIZE,
    total: count ?? 0,
    totalPages: Math.max(Math.ceil((count ?? 0) / PAGE_SIZE), 1),
  });
}
