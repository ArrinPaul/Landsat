export interface Agreement {
  /** |a - b| relative to the larger magnitude (or `floor`). */
  relativeDifference: number;
  /** 1 means identical, 0 means the sources are completely different. */
  quality: number;
  flagged: boolean;
}

/**
 * Compares the same quantity from two independent sources.
 * `floor` stops a near-zero value (e.g. 0.5 C) from turning a small absolute
 * gap into a huge ratio; use a typical magnitude for the variable.
 */
export function compareValues(a: number, b: number, options: { floor: number; tolerance?: number }): Agreement {
  const tolerance = options.tolerance ?? 0.25;
  const denominator = Math.max(Math.abs(a), Math.abs(b), options.floor);
  const relativeDifference = Math.abs(a - b) / denominator;
  return {
    relativeDifference,
    quality: Math.min(1, Math.max(0, 1 - relativeDifference)),
    flagged: relativeDifference > tolerance,
  };
}
