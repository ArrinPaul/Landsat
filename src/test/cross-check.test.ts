import { describe, expect, it } from 'vitest';
import { compareValues } from '@/lib/data/cross-check';

describe('compareValues', () => {
  it('scores close values as high quality and not flagged', () => {
    const r = compareValues(800, 820, { floor: 100 });
    expect(r.flagged).toBe(false);
    expect(r.quality).toBeCloseTo(1 - 20 / 820, 5);
  });

  it('flags values that differ by more than the tolerance', () => {
    const r = compareValues(500, 900, { floor: 100 });
    expect(r.flagged).toBe(true);
    expect(r.relativeDifference).toBeCloseTo(400 / 900, 5);
    expect(r.quality).toBeCloseTo(1 - 400 / 900, 5);
  });

  it('uses the floor so tiny values do not explode the ratio', () => {
    // 0.5 vs 1.5 degrees is a 1 degree gap, not a 200% disagreement
    const r = compareValues(0.5, 1.5, { floor: 10 });
    expect(r.relativeDifference).toBeCloseTo(0.1, 5);
    expect(r.flagged).toBe(false);
  });

  it('honours a custom tolerance', () => {
    expect(compareValues(100, 110, { floor: 1, tolerance: 0.05 }).flagged).toBe(true);
  });
});
