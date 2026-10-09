import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPowerDaily, parsePowerDaily } from '@/lib/data/nasa-power';

const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(body) } as Response);

const body = {
  properties: {
    parameter: {
      T2M: { '20240101': 19.09, '20240102': 19.1, '20240103': -999 },
      PRECTOTCORR: { '20240101': 0, '20240102': 0.12, '20240103': 4.5 },
      ALLSKY_SFC_SW_DWN: { '20240101': 14.01, '20240102': -999, '20240103': 12.8 },
    },
  },
  header: { fill_value: -999 },
};

describe('parsePowerDaily', () => {
  it('converts dates to ISO and fill values to null', () => {
    const parsed = parsePowerDaily(body);
    expect(parsed.dates).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
    expect(parsed.temperatureC).toEqual([19.09, 19.1, null]);
    expect(parsed.precipitationMm).toEqual([0, 0.12, 4.5]);
    expect(parsed.solarMjM2).toEqual([14.01, null, 12.8]);
  });

  it('throws when the response has no temperature series', () => {
    expect(() => parsePowerDaily({ properties: { parameter: {} } })).toThrow(/NASA POWER/);
    expect(() => parsePowerDaily(null)).toThrow(/NASA POWER/);
  });
});

describe('getPowerDaily', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('requests the compact date format and the AG community', async () => {
    const fetchMock = vi.fn(() => okJson(body));
    vi.stubGlobal('fetch', fetchMock);
    await getPowerDaily(20.5, 78.9, '2024-01-01', '2024-01-03');
    const url = new URL((fetchMock.mock.calls[0] as unknown as [string])[0]);
    expect(url.searchParams.get('start')).toBe('20240101');
    expect(url.searchParams.get('end')).toBe('20240103');
    expect(url.searchParams.get('community')).toBe('AG');
    expect(url.searchParams.get('parameters')).toBe('T2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN');
  });
});
