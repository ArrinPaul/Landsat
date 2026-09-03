export function getPercentageChange(start: number, end: number): number {
  if (start === 0) {
    return end > 0 ? 100.0 : 0.0;
  }

  const result = ((end - start) / Math.abs(start)) * 100;
  return Math.min(Math.max(result, -1000000), 1000000);
}
