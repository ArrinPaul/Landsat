import { describe, expect, it } from 'vitest';
import { estimated, isAvailable, measured, unavailable } from '@/lib/data/measured';

describe('Measured', () => {
  it('builds a measured value with defaults', () => {
    const m = measured(21.5, { unit: 'C', source: 'Open-Meteo' });
    expect(m).toEqual({ value: 21.5, unit: 'C', source: 'Open-Meteo', observedAt: null, quality: 1, status: 'measured' });
    expect(isAvailable(m)).toBe(true);
  });

  it('clamps quality into 0..1 and treats NaN as 0', () => {
    expect(measured(1, { unit: 'x', source: 's', quality: 7 }).quality).toBe(1);
    expect(measured(1, { unit: 'x', source: 's', quality: -3 }).quality).toBe(0);
    expect(measured(1, { unit: 'x', source: 's', quality: Number.NaN }).quality).toBe(0);
  });

  it('marks estimated values with lower default quality', () => {
    const m = estimated(10, { unit: 'mm', source: 'model' });
    expect(m.status).toBe('estimated');
    expect(m.quality).toBe(0.5);
  });

  it('represents unavailable data without a value', () => {
    const m = unavailable<number>({ unit: 'mm', source: 'NASA POWER', reason: 'timeout' });
    expect(m).toEqual({ value: null, unit: 'mm', source: 'NASA POWER', observedAt: null, quality: 0, status: 'unavailable', reason: 'timeout' });
    expect(isAvailable(m)).toBe(false);
  });
});
