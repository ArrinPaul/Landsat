import { fetchJson } from '@/lib/data/http';

const FORECAST_API_URL = 'https://api.open-meteo.com/v1/forecast';

export interface ForecastRequest {
  latitude: number;
  longitude: number;
  current?: string[];
  hourly?: string[];
  daily?: string[];
  /** Defaults to 7. */
  forecastDays?: number;
}

/**
 * Open-Meteo only returns the variables a caller requested; each field below is
 * present only if it was in the matching list of the request.
 */
export interface ForecastResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    precipitation: number;
  };
  hourly: { time: string[]; temperature_2m: number[]; weather_code: number[] };
  daily: {
    time: string[];
    precipitation_sum: (number | null)[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    evapotranspiration: (number | null)[];
  };
}

export function buildForecastUrl(request: ForecastRequest): string {
  const params = new URLSearchParams({
    latitude: String(request.latitude),
    longitude: String(request.longitude),
    timezone: 'auto',
    forecast_days: String(request.forecastDays ?? 7),
  });
  if (request.current?.length) params.set('current', request.current.join(','));
  if (request.hourly?.length) params.set('hourly', request.hourly.join(','));
  if (request.daily?.length) params.set('daily', request.daily.join(','));
  return `${FORECAST_API_URL}?${params.toString()}`;
}

/** @throws DataSourceError if Open-Meteo is unreachable or returns an error. */
export function getForecast(request: ForecastRequest): Promise<ForecastResponse> {
  return fetchJson<ForecastResponse>(buildForecastUrl(request), {
    provider: 'open-meteo',
    endpoint: 'forecast',
  });
}
