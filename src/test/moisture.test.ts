import { describe, expect, it } from 'vitest';
import {
  formatVwcPercent,
  getMoistureLevel,
  MOISTURE_DRY_BELOW,
  MOISTURE_WET_ABOVE,
} from '@/services/open-meteo';

describe('getMoistureLevel (volumetric water content in m³/m³)', () => {
  it('does not classify a typical loam value of 0.25 as Dry', () => {
    expect(getMoistureLevel(0.25)).toBe('Optimal');
  });

  it('classifies low fractions as Dry and high fractions as Wet', () => {
    expect(getMoistureLevel(0.08)).toBe('Dry');
    expect(getMoistureLevel(0.45)).toBe('Wet');
  });

  it('uses the shared thresholds as inclusive Optimal bounds', () => {
    expect(getMoistureLevel(MOISTURE_DRY_BELOW)).toBe('Optimal');
    expect(getMoistureLevel(MOISTURE_WET_ABOVE)).toBe('Optimal');
  });

});

describe('formatVwcPercent', () => {
  it('converts m³/m³ to a percent string', () => {
    expect(formatVwcPercent(0.253)).toBe('25.3%');
  });
});
