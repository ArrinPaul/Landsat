import { getSupabase } from './supabase';
import { logger } from './logger';

export type SystemMetricType = 'ai_generation' | 'api_call';

export interface SystemMetricParams {
  metric_type: SystemMetricType;
  provider: string;
  tokens_used?: number;
  is_success?: boolean;
  error_message?: string;
  metadata?: Record<string, any>;
}

/**
 * Logs a system metric to the database without throwing errors.
 * Uses fire-and-forget style for performance so it doesn't block critical paths.
 */
export async function logSystemMetric(metric: SystemMetricParams) {
  try {
    const supabase = getSupabase();
    
    // We do not await this heavily or throw errors, it's just telemetry.
    const { error } = await supabase.from('system_metrics').insert({
      metric_type: metric.metric_type,
      provider: metric.provider,
      tokens_used: metric.tokens_used ?? 0,
      is_success: metric.is_success ?? true,
      error_message: metric.error_message,
      metadata: metric.metadata,
    });

    if (error) {
      logger.error('failed_to_log_system_metric', { error: error.message, metric });
    }
  } catch (err: any) {
    logger.error('exception_logging_system_metric', { error: err.message, metric });
  }
}
