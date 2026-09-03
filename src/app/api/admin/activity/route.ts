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

  const { data: events, count, error } = await supabase
    .from('account_events')
    .select('id, event_type, metadata, created_at, users(name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 });
  }

  const totalPages = Math.ceil((count ?? 0) / limit);

  return NextResponse.json({
    events: events ?? [],
    total: count ?? 0,
    totalPages,
  });
}
