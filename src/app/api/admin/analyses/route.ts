import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-admin';
import { getSupabase } from '@/lib/supabase';

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = 50;
  const offset = (page - 1) * limit;

  const supabase = getSupabase();

  let query = supabase
    .from('analysis_jobs')
    .select('*', { count: 'exact' });

  const status = url.searchParams.get('status');
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: jobs, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch analysis jobs' }, { status: 500 });
  }

  const totalPages = Math.ceil((count ?? 0) / limit);

  return NextResponse.json({
    jobs: jobs ?? [],
    total: count ?? 0,
    totalPages,
  });
}
