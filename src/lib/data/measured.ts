/**
 * Provenance wrapper for every externally sourced number. A consumer must be
 * able to tell where a value came from, when, how much to trust it, and
 * whether it exists at all.
 */
export type MeasuredStatus = 'measured' | 'estimated' | 'unavailable';

export interface Measured<T> {
  value: T | null;
  unit: string;
  source: string;
  observedAt: string | null;
  /** 0..1. Agreement between sources, or a fixed value for single-source data. */
  quality: number;
  status: MeasuredStatus;
  /** Why the value is unavailable. Only set when status is 'unavailable'. */
  reason?: string;
}

interface MeasuredInit {
  unit: string;
  source: string;
  observedAt?: string | null;
  quality?: number;
}

function clampQuality(quality: number): number {
  if (Number.isNaN(quality)) return 0;
  return Math.min(1, Math.max(0, quality));
}

export function measured<T>(value: T, init: MeasuredInit): Measured<T> {
  return {
    value,
    unit: init.unit,
    source: init.source,
    observedAt: init.observedAt ?? null,
    quality: clampQuality(init.quality ?? 1),
    status: 'measured',
  };
}

export function estimated<T>(value: T, init: MeasuredInit): Measured<T> {
  return { ...measured(value, { ...init, quality: init.quality ?? 0.5 }), status: 'estimated' };
}

export function unavailable<T>(init: { unit: string; source: string; reason: string }): Measured<T> {
  return {
    value: null,
    unit: init.unit,
    source: init.source,
    observedAt: null,
    quality: 0,
    status: 'unavailable',
    reason: init.reason,
  };
}

export function isAvailable<T>(m: Measured<T>): m is Measured<T> & { value: T } {
  return m.status !== 'unavailable' && m.value !== null;
}
