import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSoilAndWeatherData, getSoilTypeName } from '@/services/open-meteo';

const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(body) } as Response);

describe('getSoilAndWeatherData', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads current soil moisture from the real Open-Meteo forecast API', async () => {
    const fetchMock = vi.fn(() =>
      okJson({
        latitude: 20,
        longitude: 78,
        current: { time: '2026-09-21T10:00', interval: 900, soil_moisture_0_to_1cm: 0.312 },
        current_units: { time: 'iso8601', interval: 'seconds', soil_moisture_0_to_1cm: 'm³/m³' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const data = await getSoilAndWeatherData(20, 78);

    const calledUrl = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(calledUrl).toContain('https://api.open-meteo.com/v1/forecast');
    expect(calledUrl).not.toContain('soil-api.open-meteo.com');
    expect(data.current.soil_moisture_0_to_1cm).toBe(0.312);
  });

  it('does not fabricate a soil type Open-Meteo cannot provide', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => okJson({ current: { time: 't', interval: 900, soil_moisture_0_to_1cm: 0.3 } }))
    );
    const data = await getSoilAndWeatherData(20, 78);
    expect(getSoilTypeName(data.hourly?.soil_type_0_to_10cm?.[0])).toBe('Unknown');
  });

  it('throws instead of returning mock values when the API is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));
    await expect(getSoilAndWeatherData(20, 78)).rejects.toThrow(/soil moisture/i);
  });

  it('throws when the response has no soil moisture value', async () => {
    vi.stubGlobal('fetch', vi.fn(() => okJson({ current: { time: 't', interval: 900 } })));
    await expect(getSoilAndWeatherData(20, 78)).rejects.toThrow(/soil moisture/i);
  });
});
