import { afterEach, describe, expect, it, vi } from 'vitest';
import { getHistoricalWeather } from '@/services/open-meteo';

const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(body) } as Response);

describe('getHistoricalWeather', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the API data unchanged on success', async () => {
    const body = {
      latitude: 20,
      longitude: 78,
      daily: { time: ['2026-01-01'], temperature_2m_mean: [21.5], precipitation_sum: [0] },
    };
    vi.stubGlobal('fetch', vi.fn(() => okJson(body)));
    const data = await getHistoricalWeather(20, 78, '2026-01-01', '2026-01-01');
    expect(data.daily.temperature_2m_mean).toEqual([21.5]);
  });

  it('throws instead of returning random mock weather when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));
    await expect(getHistoricalWeather(20, 78, '2026-01-01', '2026-01-10')).rejects.toThrow(/historical weather/i);
  });

  it('throws on a non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 500, statusText: 'Server Error' } as Response))
    );
    await expect(getHistoricalWeather(20, 78, '2026-01-01', '2026-01-10')).rejects.toThrow(/historical weather/i);
  });
});
