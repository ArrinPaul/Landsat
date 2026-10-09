import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DataCacheStore } from '@/lib/data/cache';
import {
  classifyUsdaTexture,
  describeSoilTexture,
  getSoilTexture,
  parseSoilGrids,
} from '@/lib/data/soilgrids';

const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(body) } as Response);

const layer = (name: string, mean: number | null, dFactor = 10) => ({
  name,
  unit_measure: { d_factor: dFactor },
  depths: [{ label: '0-5cm', values: { mean } }],
});

// Real values returned for lat 20.5, lon 78.9 (central India)
const REAL_BODY = {
  properties: {
    layers: [layer('clay', 424), layer('phh2o', 72), layer('sand', 247), layer('silt', 329), layer('soc', 154)],
  },
};

const emptyStore = (): DataCacheStore => {
  const data = new Map<string, unknown>();
  return { get: async (k) => data.get(k), set: async (k, v) => void data.set(k, v) };
};

describe('classifyUsdaTexture', () => {
  it.each([
    [92, 5, 3, 'Sand'],
    [65, 25, 10, 'Sandy loam'],
    [40, 40, 20, 'Loam'],
    [10, 85, 5, 'Silt'],
    [30, 35, 35, 'Clay loam'],
    [24.7, 32.9, 42.4, 'Clay'],
  ])('sand %d silt %d clay %d -> %s', (sand, silt, clay, expected) => {
    expect(classifyUsdaTexture(sand, silt, clay)).toBe(expected);
  });
});

describe('parseSoilGrids', () => {
  it('divides raw values by d_factor', () => {
    const soil = parseSoilGrids(REAL_BODY);
    expect(soil).toEqual({
      texture: 'Clay',
      sandPct: 24.7,
      siltPct: 32.9,
      clayPct: 42.4,
      phH2o: 7.2,
      organicCarbonGkg: 15.4,
    });
  });

  it('returns null when texture components are missing (ocean or urban point)', () => {
    const body = { properties: { layers: [layer('clay', null), layer('sand', null), layer('silt', null)] } };
    expect(parseSoilGrids(body)).toBeNull();
    expect(parseSoilGrids({})).toBeNull();
  });

  it('keeps texture when only pH and carbon are missing', () => {
    const body = { properties: { layers: [layer('clay', 200), layer('sand', 400), layer('silt', 400)] } };
    expect(parseSoilGrids(body)).toMatchObject({ phH2o: null, organicCarbonGkg: null, texture: 'Loam' });
  });
});

describe('getSoilTexture', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns a measured value with source and quality', async () => {
    vi.stubGlobal('fetch', vi.fn(() => okJson(REAL_BODY)));
    const m = await getSoilTexture(20.5, 78.9, emptyStore());
    expect(m.status).toBe('measured');
    expect(m.source).toMatch(/SoilGrids/);
    expect(m.value?.texture).toBe('Clay');
  });

  it('is unavailable (not a guess) when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));
    const m = await getSoilTexture(20.5, 78.9, emptyStore());
    expect(m.status).toBe('unavailable');
    expect(m.value).toBeNull();
    expect(describeSoilTexture(m)).toMatch(/^Unknown/);
  });

  it('is unavailable with a clear reason when SoilGrids has no data for the point', async () => {
    const body = { properties: { layers: [layer('clay', null), layer('sand', null), layer('silt', null)] } };
    vi.stubGlobal('fetch', vi.fn(() => okJson(body)));
    const m = await getSoilTexture(0, 0, emptyStore());
    expect(m.status).toBe('unavailable');
    expect(m.reason).toMatch(/no soil data/i);
  });

  it('stops waiting at the deadline but still fills the cache for the next request', async () => {
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(() => {
            resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(REAL_BODY) } as Response);
          }, 150);
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const store = emptyStore();

    const slow = await getSoilTexture(20.5, 78.9, store, 20);
    expect(slow.status).toBe('unavailable');
    expect(slow.reason).toMatch(/did not answer within/i);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const next = await getSoilTexture(20.5, 78.9, store, 20);
    expect(next.status).toBe('measured');
    expect(next.value?.texture).toBe('Clay');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('serves the second request from the cache', async () => {
    const fetchMock = vi.fn(() => okJson(REAL_BODY));
    vi.stubGlobal('fetch', fetchMock);
    const store = emptyStore();
    await getSoilTexture(20.5, 78.9, store);
    await getSoilTexture(20.5, 78.9, store);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('describeSoilTexture', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lists texture and properties with the source', async () => {
    vi.stubGlobal('fetch', vi.fn(() => okJson(REAL_BODY)));
    const text = describeSoilTexture(await getSoilTexture(20.5, 78.9, emptyStore()));
    expect(text).toContain('Clay');
    expect(text).toContain('clay 42%');
    expect(text).toContain('pH 7.2');
    expect(text).toContain('SoilGrids');
  });
});
