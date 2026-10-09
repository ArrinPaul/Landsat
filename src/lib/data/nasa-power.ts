import { fetchJson } from '@/lib/data/http';

const POWER_URL = 'https://power.larc.nasa.gov/api/temporal/daily/point';
/** NASA POWER uses -999 for missing values. */
const FILL_VALUE = -999;

export interface PowerDaily {
  /** YYYY-MM-DD */
  dates: string[];
  temperatureC: (number | null)[];
  precipitationMm: (number | null)[];
  solarMjM2: (number | null)[];
}

type Series = Record<string, unknown>;

const toIsoDate = (compact: string) => `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
const toCompact = (iso: string) => iso.replaceAll('-', '');
const clean = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value !== FILL_VALUE ? value : null;

export function parsePowerDaily(body: unknown): PowerDaily {
  const parameter = (body as { properties?: { parameter?: Record<string, Series> } } | null)?.properties?.parameter;
  const temperature = parameter?.T2M;
  if (!temperature || typeof temperature !== 'object') {
    throw new Error('NASA POWER response contained no temperature series');
  }
  const precipitation = parameter?.PRECTOTCORR ?? {};
  const solar = parameter?.ALLSKY_SFC_SW_DWN ?? {};
  const days = Object.keys(temperature).sort();
  return {
    dates: days.map(toIsoDate),
    temperatureC: days.map((day) => clean(temperature[day])),
    precipitationMm: days.map((day) => clean(precipitation[day])),
    solarMjM2: days.map((day) => clean(solar[day])),
  };
}

/**
 * Daily temperature, corrected precipitation and surface solar radiation.
 * @param startDate YYYY-MM-DD
 * @param endDate YYYY-MM-DD
 * @throws DataSourceError on network/HTTP failure, Error if the body is unusable.
 */
export async function getPowerDaily(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string,
): Promise<PowerDaily> {
  const params = new URLSearchParams({
    parameters: 'T2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN',
    community: 'AG',
    latitude: String(latitude),
    longitude: String(longitude),
    start: toCompact(startDate),
    end: toCompact(endDate),
    format: 'JSON',
  });
  const body = await fetchJson<unknown>(`${POWER_URL}?${params.toString()}`, {
    provider: 'nasa-power',
    endpoint: 'daily_point',
    timeoutMs: 30_000,
  });
  return parsePowerDaily(body);
}
