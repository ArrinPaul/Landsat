import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildForecastUrl, getForecast } from '@/lib/data/open-meteo-forecast';

const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(body) } as Response);

describe('buildForecastUrl', () => {
  it('includes only requested sections', () => {
    const url = new URL(
      buildForecastUrl({ latitude: 20.5, longitude: 78.9, current: ['temperature_2m', 'weather_code'], forecastDays: 1 }),
    );
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(url.searchParams.get('latitude')).toBe('20.5');
    expect(url.searchParams.get('current')).toBe('temperature_2m,weather_code');
    expect(url.searchParams.get('daily')).toBeNull();
    expect(url.searchParams.get('forecast_days')).toBe('1');
    expect(url.searchParams.get('timezone')).toBe('auto');
  });

  it('defaults to 7 forecast days', () => {
    const url = new URL(buildForecastUrl({ latitude: 1, longitude: 2, daily: ['precipitation_sum'] }));
    expect(url.searchParams.get('forecast_days')).toBe('7');
    expect(url.searchParams.get('daily')).toBe('precipitation_sum');
  });
});

describe('getForecast', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the parsed forecast', async () => {
    const body = { latitude: 20, longitude: 78, daily: { time: ['2026-10-10'], precipitation_sum: [1.2] } };
    vi.stubGlobal('fetch', vi.fn(() => okJson(body)));
    const data = await getForecast({ latitude: 20, longitude: 78, daily: ['precipitation_sum'] });
    expect(data.daily.precipitation_sum).toEqual([1.2]);
  });

  it('throws when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));
    await expect(getForecast({ latitude: 20, longitude: 78, daily: ['precipitation_sum'] })).rejects.toThrow(/network down/);
  });
});
