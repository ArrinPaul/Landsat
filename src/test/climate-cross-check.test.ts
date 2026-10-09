import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/open-meteo', () => ({ getHistoricalWeather: vi.fn() }));
vi.mock('@/lib/data/nasa-power', () => ({ getPowerDaily: vi.fn() }));

import { describeClimateQuality, getCrossCheckedClimate } from '@/lib/data/climate-cross-check';
import { getPowerDaily } from '@/lib/data/nasa-power';
import { getHistoricalWeather } from '@/services/open-meteo';

const NOW = new Date('2026-10-10T00:00:00Z');

function days(count: number) {
  return Array.from({ length: count }, (_, i) => `d${i}`);
}
const omSeries = (count: number, temp: number, precip: number) => ({
  daily: {
    time: days(count),
    temperature_2m_mean: Array(count).fill(temp),
    precipitation_sum: Array(count).fill(precip),
  },
});
const powerSeries = (count: number, temp: number, precip: number, solar = 15) => ({
  dates: days(count),
  temperatureC: Array(count).fill(temp),
  precipitationMm: Array(count).fill(precip),
  solarMjM2: Array(count).fill(solar),
});

describe('getCrossCheckedClimate', () => {
  afterEach(() => vi.clearAllMocks());

  it('combines two agreeing sources with high quality', async () => {
    vi.mocked(getHistoricalWeather).mockResolvedValue(omSeries(365, 25, 2) as never);
    vi.mocked(getPowerDaily).mockResolvedValue(powerSeries(365, 25.4, 2.1) as never);
    const c = await getCrossCheckedClimate(20.5, 78.9, NOW);
    expect(c.temperatureC.status).toBe('measured');
    expect(c.temperatureC.value).toBeCloseTo(25.2, 1);
    expect(c.temperatureC.quality).toBeGreaterThan(0.9);
    expect(c.precipitationMm.value).toBeCloseTo((365 * 2 + 365 * 2.1) / 2, 0);
    expect(c.solarMjM2.value).toBeCloseTo(15, 5);
    // solar is single-source by design; temperature and precipitation agree, so no caveat for them
    expect(c.notes.some((n) => /temperature|precipitation/.test(n))).toBe(false);
  });

  it('flags and lowers quality when the sources disagree', async () => {
    vi.mocked(getHistoricalWeather).mockResolvedValue(omSeries(365, 25, 1) as never); // 365 mm
    vi.mocked(getPowerDaily).mockResolvedValue(powerSeries(365, 25, 3) as never); // 1095 mm
    const c = await getCrossCheckedClimate(20.5, 78.9, NOW);
    expect(c.precipitationMm.quality).toBeLessThan(0.5);
    expect(c.notes.join(' ')).toMatch(/precipitation/i);
    expect(c.notes.join(' ')).toMatch(/differ/i);
  });

  it('falls back to the one working source with reduced quality', async () => {
    vi.mocked(getHistoricalWeather).mockRejectedValue(new Error('down'));
    vi.mocked(getPowerDaily).mockResolvedValue(powerSeries(365, 20, 2) as never);
    const c = await getCrossCheckedClimate(20.5, 78.9, NOW);
    expect(c.temperatureC.value).toBeCloseTo(20, 5);
    expect(c.temperatureC.source).toBe('NASA POWER');
    expect(c.temperatureC.quality).toBeLessThan(1);
    expect(c.notes.join(' ')).toMatch(/single source/i);
  });

  it('reports unavailable, never a default number, when both sources fail', async () => {
    vi.mocked(getHistoricalWeather).mockRejectedValue(new Error('down'));
    vi.mocked(getPowerDaily).mockRejectedValue(new Error('down'));
    const c = await getCrossCheckedClimate(20.5, 78.9, NOW);
    expect(c.temperatureC.status).toBe('unavailable');
    expect(c.temperatureC.value).toBeNull();
    expect(c.precipitationMm.status).toBe('unavailable');
    expect(c.solarMjM2.status).toBe('unavailable');
  });

  it('does not report an annual total from a series with large gaps', async () => {
    // 100 valid days only: summing them would silently understate annual rain
    vi.mocked(getHistoricalWeather).mockResolvedValue(omSeries(100, 25, 2) as never);
    vi.mocked(getPowerDaily).mockRejectedValue(new Error('down'));
    const c = await getCrossCheckedClimate(20.5, 78.9, NOW);
    expect(c.precipitationMm.status).toBe('unavailable');
    expect(c.precipitationMm.reason).toMatch(/valid days/i);
  });

  it('ignores null days when counting and averaging', async () => {
    const om = omSeries(365, 25, 2);
    om.daily.temperature_2m_mean[0] = null as never;
    om.daily.precipitation_sum[0] = null as never;
    vi.mocked(getHistoricalWeather).mockResolvedValue(om as never);
    vi.mocked(getPowerDaily).mockRejectedValue(new Error('down'));
    const c = await getCrossCheckedClimate(20.5, 78.9, NOW);
    expect(c.temperatureC.value).toBeCloseTo(25, 5);
    expect(c.precipitationMm.value).toBeCloseTo(364 * 2, 5);
  });
});

describe('describeClimateQuality', () => {
  it('summarises sources, quality and notes for a prompt', async () => {
    vi.mocked(getHistoricalWeather).mockResolvedValue(omSeries(365, 25, 2) as never);
    vi.mocked(getPowerDaily).mockResolvedValue(powerSeries(365, 25, 2) as never);
    const text = describeClimateQuality(await getCrossCheckedClimate(20.5, 78.9, NOW));
    expect(text).toMatch(/Open-Meteo/);
    expect(text).toMatch(/NASA POWER/);
  });
});
