import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-admin';
import { getSupabase } from '@/lib/supabase';

export async function GET(_req: Request) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const supabase = getSupabase();

  // Fetch metrics from the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: metrics, error } = await supabase
    .from('system_metrics')
    .select('*')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch system metrics' }, { status: 500 });
  }

  // Aggregate by day
  const aggregated: Record<string, {
    date: string;
    aiTokens: number;
    aiCostEst: number;
    weatherCalls: number;
    successRate: number;
    _successes: number;
    _failures: number;
  }> = {};

  // Initialize last 7 days with 0s to ensure consistent charting
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    aggregated[dateStr] = {
      date: dateStr,
      aiTokens: 0,
      aiCostEst: 0,
      weatherCalls: 0,
      successRate: 100,
      _successes: 0,
      _failures: 0,
    };
  }

  // Populate data
  if (metrics) {
    for (const metric of metrics) {
      const dateStr = new Date(metric.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!aggregated[dateStr]) continue;

      const group = aggregated[dateStr];

      if (metric.is_success) {
        group._successes++;
      } else {
        group._failures++;
      }

      if (metric.metric_type === 'ai_generation') {
        group.aiTokens += (metric.tokens_used || 0);
        // Groq approx cost $0.50 per 1M tokens
        group.aiCostEst += ((metric.tokens_used || 0) / 1000000) * 0.50;
      } else if (metric.metric_type === 'api_call') {
        group.weatherCalls++;
      }
    }
  }

  // Calculate final success rate percentages
  const chartData = Object.values(aggregated).map((group) => {
    const total = group._successes + group._failures;
    group.successRate = total === 0 ? 100 : Math.round((group._successes / total) * 100);
    
    // Cleanup internal counters
    const { _successes, _failures, ...rest } = group;
    return { ...rest, success: _successes, failed: _failures };
  });

  return NextResponse.json({
    data: chartData,
  });
}
