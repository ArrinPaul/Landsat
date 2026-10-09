import { logger } from '@/lib/logger';
import { getSupabase } from '@/lib/supabase';

export interface DataCacheStore {
  /** Returns the cached value, or `undefined` when missing or expired. */
  get(key: string): Promise<unknown | undefined>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
}

/** Rounds to 2 decimals (about 1 km) so nearby requests share an entry. */
export function cacheKey(source: string, latitude: number, longitude: number, ...parts: Array<string | number>): string {
  const base = `${source}:${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
  return parts.length > 0 ? `${base}:${parts.join(':')}` : base;
}

export function createSupabaseStore(): DataCacheStore {
  return {
    async get(key) {
      const { data, error } = await getSupabase()
        .from('data_cache')
        .select('value, expires_at')
        .eq('key', key)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return undefined;
      return new Date(data.expires_at as string).getTime() > Date.now() ? data.value : undefined;
    },
    async set(key, value, ttlSeconds) {
      const { error } = await getSupabase()
        .from('data_cache')
        .upsert({ key, value, expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString() });
      if (error) throw new Error(error.message);
    },
  };
}

/**
 * Returns the cached value for `key`, otherwise runs `loader` and caches its
 * result. The cache is an optimisation: any store failure is logged and
 * ignored, and loader errors propagate without being cached.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
  store: DataCacheStore = createSupabaseStore(),
): Promise<T> {
  try {
    const hit = await store.get(key);
    if (hit !== undefined) return hit as T;
  } catch (error: unknown) {
    logger.warn('data_cache_read_failed', { scope: 'lib.data.cache', key, error: String(error) });
  }

  const value = await loader();

  try {
    await store.set(key, value, ttlSeconds);
  } catch (error: unknown) {
    logger.warn('data_cache_write_failed', { scope: 'lib.data.cache', key, error: String(error) });
  }
  return value;
}
