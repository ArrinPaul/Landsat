import { afterEach, describe, expect, it, vi } from 'vitest';
import { averageAnnualPrecipitationMm, getHistoricalPrecipitation } from '@/services/open-meteo';

const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(body) } as Response);

/** Build a daily series where every day of each listed year has the same value. */
function dailySeries(years: number[], perDayMm: number) {
  const times: string[] = [];
  const values: (number | null)[] = [];
  for (const year of years) {
    const d = new Date(Date.UTC(year, 0, 1));
    while (d.getUTCFullYear() === year) {
      times.push(d.toISOString().slice(0, 10));
      values.push(perDayMm);
      d.setUTCDate(d.getUTCDate() + 1);
    }
  }
  return { times, values };
}

describe('averageAnnualPrecipitationMm', () => {
  it('averages the yearly totals of complete years', () => {
    const { times, values } = dailySeries([2001, 2002], 2); // 730 mm each (neither is a leap year)
    expect(averageAnnualPrecipitationMm(times, values)).toBeCloseTo(730, 0);
  });

  it('ignores null days but rejects years that are mostly missing', () => {
    const complete = dailySeries([2001], 1);
    const sparse = dailySeries([2002], 100);
    // Blank out all but 30 days of 2002 so it is not a usable year.
    sparse.values = sparse.values.map((v, i) => (i < 30 ? v : null));
    const times = [...complete.times, ...sparse.times];
    const values = [...complete.values, ...sparse.values];
    expect(averageAnnualPrecipitationMm(times, values)).toBeCloseTo(365, 0);
  });

  it('returns null when no year has enough data', () => {
    expect(averageAnnualPrecipitationMm(['2001-01-01'], [5])).toBeNull();
    expect(averageAnnualPrecipitationMm([], [])).toBeNull();
  });
});

describe('getHistoricalPrecipitation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests daily data, not the unsupported yearly parameter', async () => {
    const { times, values } = dailySeries([2001, 2002, 2003], 1.5);
    const fetchMock = vi.fn(() => okJson({ daily: { time: times, precipitation_sum: values } }));
    vi.stubGlobal('fetch', fetchMock);

    const data = await getHistoricalPrecipitation(20, 78);

    const calledUrl = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(calledUrl).toContain('daily=precipitation_sum');
    expect(calledUrl).not.toContain('yearly=');
    expect(data.yearly.time).toEqual(['1991-2020 Average']);
    expect(data.yearly.precipitation_sum[0]).toBeGreaterThan(540);
    expect(data.yearly.precipitation_sum[0]).toBeLessThan(555);
  });

  it('throws instead of returning a random mock when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));
    await expect(getHistoricalPrecipitation(20, 78)).rejects.toThrow(/precipitation/i);
  });

  it('throws when the response has too little data to compute a normal', async () => {
    vi.stubGlobal('fetch', vi.fn(() => okJson({ daily: { time: ['2001-01-01'], precipitation_sum: [1] } })));
    await expect(getHistoricalPrecipitation(20, 78)).rejects.toThrow(/precipitation/i);
  });
});
