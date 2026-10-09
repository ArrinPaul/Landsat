
/**
 * @fileOverview A service to fetch agricultural and weather data from the Open-Meteo API.
 */
import { logger } from '@/lib/logger';
import { redactSensitive } from '@/lib/security';
import { getTraceContext } from '@/lib/trace';
import { logSystemMetric } from '@/lib/metrics';
import { cacheKey, withCache, type DataCacheStore } from '@/lib/data/cache';

const ARCHIVE_API_URL = "https://archive-api.open-meteo.com/v1/archive";
const FORECAST_API_URL = "https://api.open-meteo.com/v1/forecast";


export interface SoilAndWeatherData {
    latitude: number;
    longitude: number;
    generationtime_ms: number;
    utc_offset_seconds: number;
    timezone: string;
    timezone_abbreviation: string;
    elevation: number;
    current_units: {
        time: string;
        interval: string;
        soil_moisture_0_to_1cm: string;
    };
    current: {
        time: string;
        interval: number;
        soil_moisture_0_to_1cm: number;
    };
    hourly_units?: {
        time: string;
        soil_type_0_to_10cm: string;
    };
    hourly?: {
        time: string[];
        soil_type_0_to_10cm: number[];
    };
}

export interface HistoricalWeatherData {
    latitude: number,
    longitude: number,
    generationtime_ms: number,
    utc_offset_seconds: number,
    timezone: string,
    timezone_abbreviation: string,
    elevation: number,
    daily_units: {
        time: string,
        temperature_2m_mean: string,
        precipitation_sum: string
    },
    daily: {
        time: string[],
        temperature_2m_mean: (number | null)[],
        precipitation_sum: (number | null)[]
    }
}

export interface HistoricalPrecipitationData {
    latitude: number;
    longitude: number;
    generationtime_ms: number;
    utc_offset_seconds: number;
    timezone: string;
    timezone_abbreviation: string;
    elevation: number;
    yearly_units: {
        time: string;
        precipitation_sum: string;
    };
    yearly: {
        time: string[];
        precipitation_sum: (number | null)[];
    };
}


/**
 * Fetches the latest topsoil moisture for a given location from the Open-Meteo forecast API.
 * Open-Meteo does not provide soil texture, so `hourly.soil_type_0_to_10cm` is left undefined
 * (getSoilTypeName reports "Unknown") rather than being guessed.
 * @param latitude The latitude of the location.
 * @param longitude The longitude of the location.
 * @returns A promise that resolves to the soil moisture data.
 * @throws If the API is unreachable or returns no soil moisture value. No mock data is returned.
 */
export async function getSoilAndWeatherData(latitude: number, longitude: number): Promise<SoilAndWeatherData> {
    const traceId = getTraceContext()?.requestId;
    const url = `${FORECAST_API_URL}?latitude=${latitude}&longitude=${longitude}&current=soil_moisture_0_to_1cm`;

    try {
        const response = await fetch(url, {
            cache: 'no-store',
            headers: traceId ? { 'x-request-id': traceId } : undefined,
        });
        if (!response.ok) {
            throw new Error(`Open-Meteo API returned an error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const moisture = data?.current?.soil_moisture_0_to_1cm;
        if (typeof moisture !== 'number' || Number.isNaN(moisture)) {
            throw new Error('Open-Meteo response contained no soil moisture value');
        }

        logSystemMetric({ metric_type: 'api_call', provider: 'open-meteo', is_success: true, metadata: { endpoint: 'soil' } });
        return data as SoilAndWeatherData;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('soil_fetch_failed', {
            scope: 'services.open-meteo',
            endpoint: FORECAST_API_URL,
            error: redactSensitive(message),
        });
        logSystemMetric({ metric_type: 'api_call', provider: 'open-meteo', is_success: false, error_message: message, metadata: { endpoint: 'soil' } });
        throw new Error(`Failed to fetch soil moisture data: ${message}`);
    }
}

/**
 * Fetches historical daily weather data (temp and precipitation) for a given location and date range.
 * @param latitude The latitude of the location.
 * @param longitude The longitude of the location.
 * @param startDate The start date in YYYY-MM-DD format.
 * @param endDate The end date in YYYY-MM-DD format.
 * @returns A promise that resolves to the historical weather data.
 */
export async function getHistoricalWeather(latitude: number, longitude: number, startDate: string, endDate: string): Promise<HistoricalWeatherData> {
    const traceId = getTraceContext()?.requestId;
    const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        start_date: startDate,
        end_date: endDate,
        daily: "temperature_2m_mean,precipitation_sum",
        timezone: "auto"
    });

    const url = `${ARCHIVE_API_URL}?${params.toString()}`;
    
    try {
        const response = await fetch(url, {
            cache: 'no-store',
            headers: traceId ? { 'x-request-id': traceId } : undefined,
        });
         if (!response.ok) {
            throw new Error(`Open-Meteo Archive API returned an error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        
        logSystemMetric({ metric_type: 'api_call', provider: 'open-meteo', is_success: true, metadata: { endpoint: 'historical_weather' } });

        return data as HistoricalWeatherData;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('historical_weather_fetch_failed', {
            scope: 'services.open-meteo',
            error: redactSensitive(message),
        });
        logSystemMetric({ metric_type: 'api_call', provider: 'open-meteo', is_success: false, error_message: message, metadata: { endpoint: 'historical_weather' } });
        throw new Error(`Failed to fetch historical weather: ${message}`);
    }
}

/** A year needs at least this many non-null daily values to count towards the normal. */
const MIN_DAYS_PER_NORMAL_YEAR = 330;

/**
 * Averages annual precipitation totals from a daily series.
 * Only years with enough non-null days are used, so a gap-filled year does not drag the mean down.
 * @returns The mean yearly total in mm, or null when no year has enough data.
 */
export function averageAnnualPrecipitationMm(times: string[], values: (number | null)[]): number | null {
    const perYear = new Map<string, { sum: number; days: number }>();
    for (let i = 0; i < times.length; i++) {
        const value = values[i];
        if (value === null || value === undefined || Number.isNaN(value)) continue;
        const year = times[i].slice(0, 4);
        const entry = perYear.get(year) ?? { sum: 0, days: 0 };
        entry.sum += value;
        entry.days += 1;
        perYear.set(year, entry);
    }
    const totals = [...perYear.values()].filter(y => y.days >= MIN_DAYS_PER_NORMAL_YEAR).map(y => y.sum);
    if (totals.length === 0) return null;
    return totals.reduce((a, b) => a + b, 0) / totals.length;
}

/**
 * Fetches the 1991-2020 average annual precipitation for a given location.
 * The archive API has no yearly aggregation, so this requests daily ERA5 data and aggregates it.
 * @param latitude The latitude of the location.
 * @param longitude The longitude of the location.
 * @returns A promise that resolves to the precipitation normal (`yearly.precipitation_sum[0]`, mm/year).
 * @throws If the API is unreachable or returns too little data. No mock data is returned.
 */
async function fetchHistoricalPrecipitation(latitude: number, longitude: number): Promise<HistoricalPrecipitationData> {
    const traceId = getTraceContext()?.requestId;
    const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        start_date: '1991-01-01',
        end_date: '2020-12-31',
        daily: 'precipitation_sum',
        models: 'era5_seamless',
    });

    try {
        const response = await fetch(`${ARCHIVE_API_URL}?${params.toString()}`, {
            cache: 'no-store',
            headers: traceId ? { 'x-request-id': traceId } : undefined,
        });
        if (!response.ok) {
            throw new Error(`Open-Meteo Archive API returned an error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const average = averageAnnualPrecipitationMm(data?.daily?.time ?? [], data?.daily?.precipitation_sum ?? []);
        if (average === null) {
            throw new Error('Open-Meteo response had too little data to compute a precipitation normal');
        }

        logSystemMetric({ metric_type: 'api_call', provider: 'open-meteo', is_success: true, metadata: { endpoint: 'historical_precipitation' } });

        return {
            latitude: data.latitude ?? latitude,
            longitude: data.longitude ?? longitude,
            generationtime_ms: data.generationtime_ms ?? 0,
            utc_offset_seconds: data.utc_offset_seconds ?? 0,
            timezone: data.timezone ?? 'UTC',
            timezone_abbreviation: data.timezone_abbreviation ?? 'UTC',
            elevation: data.elevation ?? 0,
            yearly_units: { time: 'string', precipitation_sum: 'mm' },
            yearly: { time: ['1991-2020 Average'], precipitation_sum: [average] },
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('historical_precipitation_fetch_failed', {
            scope: 'services.open-meteo',
            error: redactSensitive(message),
        });
        logSystemMetric({ metric_type: 'api_call', provider: 'open-meteo', is_success: false, error_message: message, metadata: { endpoint: 'historical_precipitation' } });
        throw new Error(`Failed to fetch precipitation normal: ${message}`);
    }
}


const THIRTY_DAYS_S = 30 * 24 * 60 * 60;

/**
 * The 1991-2020 normal for a location is fixed, so it is cached for 30 days
 * (it is about 11,000 daily rows to download otherwise).
 * @param store Injected in tests; defaults to the Supabase-backed cache.
 */
export function getHistoricalPrecipitation(
    latitude: number,
    longitude: number,
    store?: DataCacheStore,
): Promise<HistoricalPrecipitationData> {
    return withCache(
        cacheKey('open-meteo-normal-1991-2020', latitude, longitude),
        THIRTY_DAYS_S,
        () => fetchHistoricalPrecipitation(latitude, longitude),
        store,
    );
}

/**
 * Maps the soil type index from the API to a human-readable name.
 * See https://open-meteo.com/en/docs/soil_and_weather_api for index mapping.
 * @param typeIndex The soil type index from the API response.
 * @returns The human-readable soil type name.
 */
export function getSoilTypeName(typeIndex: number | undefined): string {
    if (typeIndex === undefined) return "Unknown";
    const soilTypes = [
        "Sand", "Loamy Sand", "Sandy Loam", "Loam", "Silt Loam",
        "Silt", "Sandy Clay Loam", "Clay Loam", "Silty Clay Loam",
        "Sandy Clay", "Silty Clay", "Clay"
    ];
    return soilTypes[typeIndex] || "Unknown";
}

/** Volumetric water content (m³/m³) below which topsoil is considered dry. */
export const MOISTURE_DRY_BELOW = 0.2;
/** Volumetric water content (m³/m³) above which topsoil is considered wet. */
export const MOISTURE_WET_ABOVE = 0.4;

/**
 * Categorizes the volumetric water content into a moisture level.
 * Open-Meteo reports soil moisture as a fraction in m³/m³ (about 0.05 to 0.5).
 * @param vwc The volumetric water content in m³/m³ (e.g., 0.255).
 * @returns 'Dry', 'Optimal', or 'Wet'.
 */
export function getMoistureLevel(vwc: number | undefined): 'Dry' | 'Optimal' | 'Wet' {
    if (vwc === undefined || Number.isNaN(vwc)) return "Optimal"; // Default fallback
    if (vwc < MOISTURE_DRY_BELOW) return 'Dry';
    if (vwc > MOISTURE_WET_ABOVE) return 'Wet';
    return 'Optimal';
}

/** Formats a m³/m³ volumetric water content fraction as a percent string. */
export function formatVwcPercent(vwc: number): string {
    return `${(vwc * 100).toFixed(1)}%`;
}
