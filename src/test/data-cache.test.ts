import { describe, expect, it, vi } from 'vitest';
import { cacheKey, withCache, type DataCacheStore } from '@/lib/data/cache';

function memoryStore(): DataCacheStore & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    get: async (key) => data.get(key),
    set: async (key, value) => {
      data.set(key, value);
    },
  };
}

describe('cacheKey', () => {
  it('rounds coordinates to 2 decimals and appends parts', () => {
    expect(cacheKey('soilgrids', 20.50432, 78.9111)).toBe('soilgrids:20.50:78.91');
    expect(cacheKey('om-normal', 20.5, 78.9, '1991-2020')).toBe('om-normal:20.50:78.90:1991-2020');
  });
});

describe('withCache', () => {
  it('loads once and serves the second call from the store', async () => {
    const store = memoryStore();
    const loader = vi.fn(async () => ({ mm: 812 }));
    expect(await withCache('k', 60, loader, store)).toEqual({ mm: 812 });
    expect(await withCache('k', 60, loader, store)).toEqual({ mm: 812 });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('does not cache loader failures', async () => {
    const store = memoryStore();
    const loader = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(5);
    await expect(withCache('k', 60, loader, store)).rejects.toThrow('boom');
    expect(await withCache('k', 60, loader, store)).toBe(5);
  });

  it('still returns the loaded value when the store read and write both fail', async () => {
    const store: DataCacheStore = {
      get: async () => {
        throw new Error('supabase down');
      },
      set: async () => {
        throw new Error('supabase down');
      },
    };
    expect(await withCache('k', 60, async () => 42, store)).toBe(42);
  });

  it('caches a null result so a missing-data answer is not refetched', async () => {
    const store = memoryStore();
    const loader = vi.fn(async () => null);
    await withCache('k', 60, loader, store);
    await withCache('k', 60, loader, store);
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
