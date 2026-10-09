import { logger } from '@/lib/logger';
import { logSystemMetric } from '@/lib/metrics';
import { redactSensitive } from '@/lib/security';
import { getTraceContext } from '@/lib/trace';

export class DataSourceError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'DataSourceError';
  }
}

export interface FetchJsonOptions {
  provider: string;
  endpoint: string;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  headers?: Record<string, string>;
}

const isRetryable = (status: number) => status === 429 || status >= 500;
const sleep = (ms: number) => (ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve());

/**
 * GETs a URL and parses JSON with a timeout, bounded retries and a system metric.
 * @throws DataSourceError after the last attempt fails. Never returns fabricated data.
 */
export async function fetchJson<T = unknown>(url: string, options: FetchJsonOptions): Promise<T> {
  const { provider, endpoint } = options;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const attempts = (options.retries ?? 2) + 1;
  const retryDelayMs = options.retryDelayMs ?? 300;
  const traceId = getTraceContext()?.requestId;

  let lastError: DataSourceError | undefined;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let retryable = true;
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { ...(traceId ? { 'x-request-id': traceId } : {}), ...options.headers },
      });
      if (response.ok) {
        const data = (await response.json()) as T;
        logSystemMetric({ metric_type: 'api_call', provider, is_success: true, metadata: { endpoint } });
        return data;
      }
      lastError = new DataSourceError(
        `${provider} returned an error: ${response.status} ${response.statusText}`,
        provider,
        response.status,
      );
      retryable = isRetryable(response.status);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = new DataSourceError(`${provider} request failed: ${message}`, provider);
    }
    if (!retryable) break;
    if (attempt < attempts) await sleep(retryDelayMs * attempt);
  }

  const failure = lastError ?? new DataSourceError(`${provider} request failed`, provider);
  logger.error('data_source_fetch_failed', {
    scope: 'lib.data.http',
    provider,
    endpoint,
    error: redactSensitive(failure.message),
  });
  logSystemMetric({
    metric_type: 'api_call',
    provider,
    is_success: false,
    error_message: failure.message,
    metadata: { endpoint },
  });
  throw failure;
}
