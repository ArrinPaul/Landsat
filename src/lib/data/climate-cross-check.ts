import { compareValues } from '@/lib/data/cross-check';
import { isAvailable, measured, unavailable, type Measured } from '@/lib/data/measured';
import { getPowerDaily } from '@/lib/data/nasa-power';
import { getHistoricalWeather } from '@/services/open-meteo';

const OPEN_METEO = 'Open-Meteo ERA5';
const NASA_POWER = 'NASA POWER';
/** A source must have at least this many valid days (of 365) to be trusted. */
const MIN_VALID_DAYS = 330;
/** Quality assigned when only one source answered, so nothing was cross-checked. */
const SINGLE_SOURCE_QUALITY = 0.7;

export interface CrossCheckedClimate {
  temperatureC: Measured<number>;
  precipitationMm: Measured<number>;
  solarMjM2: Measured<number>;
  notes: string[];
}

interface SourceStat {
  value: number | null;
  reason?: string;
}

const valid = (series: (number | null)[]) => series.filter((v): v is number => typeof v === 'number');

function stat(series: (number | null)[] | undefined, kind: 'mean' | 'sum'): SourceStat {
  const values = valid(series ?? []);
  if (values.length < MIN_VALID_DAYS) {
    return { value: null, reason: `only ${values.length} valid days (need ${MIN_VALID_DAYS})` };
  }
  const total = values.reduce((a, b) => a + b, 0);
  return { value: kind === 'mean' ? total / values.length : total };
}

const iso = (d: Date) => d.toISOString().split('T')[0];

const errorMessage = (reason: unknown) => (reason instanceof Error ? reason.message : String(reason));

interface CombineInit {
  label: string;
  unit: string;
  floor: number;
  observedAt: string;
  notes: string[];
}

function combine(om: SourceStat, power: SourceStat, init: CombineInit): Measured<number> {
  const { label, unit, floor, observedAt, notes } = init;
  if (om.value !== null && power.value !== null) {
    const agreement = compareValues(om.value, power.value, { floor });
    if (agreement.flagged) {
      const pct = (agreement.relativeDifference * 100).toFixed(0);
      notes.push(
        `${label}: ${OPEN_METEO} (${om.value.toFixed(1)}) and ${NASA_POWER} (${power.value.toFixed(1)}) differ by ${pct}%`,
      );
    }
    return measured((om.value + power.value) / 2, {
      unit,
      source: `${OPEN_METEO} + ${NASA_POWER}`,
      observedAt,
      quality: agreement.quality,
    });
  }

  const only =
    om.value !== null
      ? { source: OPEN_METEO, value: om.value }
      : power.value !== null
        ? { source: NASA_POWER, value: power.value }
        : null;
  if (only) {
    notes.push(`${label}: single source (${only.source}), not cross-checked`);
    return measured(only.value, { unit, source: only.source, observedAt, quality: SINGLE_SOURCE_QUALITY });
  }

  const reason = [om.reason && `${OPEN_METEO}: ${om.reason}`, power.reason && `${NASA_POWER}: ${power.reason}`]
    .filter(Boolean)
    .join('; ');
  return unavailable({ unit, source: `${OPEN_METEO} + ${NASA_POWER}`, reason: reason || 'no data returned' });
}

/**
 * Annual mean temperature, annual precipitation and mean solar radiation over
 * the 365 days ending 7 days before `now`, cross-checked between Open-Meteo
 * (ERA5) and NASA POWER. Never throws; failures become `unavailable`.
 */
export async function getCrossCheckedClimate(
  latitude: number,
  longitude: number,
  now: Date = new Date(),
): Promise<CrossCheckedClimate> {
  const end = new Date(now.getTime() - 7 * 86_400_000);
  const start = new Date(end.getTime() - 364 * 86_400_000);
  const startDate = iso(start);
  const endDate = iso(end);

  const [omResult, powerResult] = await Promise.allSettled([
    getHistoricalWeather(latitude, longitude, startDate, endDate),
    getPowerDaily(latitude, longitude, startDate, endDate),
  ]);

  const omFailed: SourceStat = omResult.status === 'rejected' ? { value: null, reason: errorMessage(omResult.reason) } : { value: null };
  const powerFailed: SourceStat =
    powerResult.status === 'rejected' ? { value: null, reason: errorMessage(powerResult.reason) } : { value: null };

  const omTemp = omResult.status === 'fulfilled' ? stat(omResult.value.daily.temperature_2m_mean, 'mean') : omFailed;
  const omPrecip = omResult.status === 'fulfilled' ? stat(omResult.value.daily.precipitation_sum, 'sum') : omFailed;
  const powerTemp = powerResult.status === 'fulfilled' ? stat(powerResult.value.temperatureC, 'mean') : powerFailed;
  const powerPrecip = powerResult.status === 'fulfilled' ? stat(powerResult.value.precipitationMm, 'sum') : powerFailed;
  const powerSolar = powerResult.status === 'fulfilled' ? stat(powerResult.value.solarMjM2, 'mean') : powerFailed;

  const notes: string[] = [];
  return {
    temperatureC: combine(omTemp, powerTemp, { label: 'temperature', unit: 'C', floor: 10, observedAt: endDate, notes }),
    precipitationMm: combine(omPrecip, powerPrecip, { label: 'precipitation', unit: 'mm/year', floor: 100, observedAt: endDate, notes }),
    solarMjM2: combine({ value: null }, powerSolar, { label: 'solar radiation', unit: 'MJ/m2/day', floor: 5, observedAt: endDate, notes }),
    notes,
  };
}

/** One short paragraph for LLM prompts: sources, quality and any disagreement. */
export function describeClimateQuality(climate: CrossCheckedClimate): string {
  const part = (label: string, m: Measured<number>) =>
    isAvailable(m) ? `${label} from ${m.source} (quality ${(m.quality * 100).toFixed(0)}%)` : `${label} unavailable`;
  const lines = [
    `Data sources: ${part('temperature', climate.temperatureC)}; ${part('precipitation', climate.precipitationMm)}.`,
  ];
  if (climate.notes.length > 0) lines.push(`Data caveats: ${climate.notes.join('; ')}.`);
  return lines.join(' ');
}
