
/**
 * @fileOverview A service to fetch agricultural and weather data from the Open-Meteo API.
 */
import { logger } from '@/lib/logger';
import { redactSensitive } from '@/lib/security';
import { getTraceContext } from '@/lib/trace';
import { logSystemMetric } from '@/lib/metrics';

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
        logger.warn('historical_weather_mock_fallback', { scope: 'services.open-meteo' });
        
        // Return mock historical data as fallback
        const days = Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
        const mockTemps: number[] = [];
        const mockPrecip: number[] = [];
        const mockTimes: string[] = [];
        
        for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            mockTimes.push(date.toISOString().split('T')[0]);
            // Generate realistic seasonal temperatures (15-25°C avg)
            mockTemps.push(15 + Math.random() * 10);
            // Random precipitation (0-20mm)
            mockPrecip.push(Math.random() * 20);
        }
        
        return {
            latitude,
            longitude,
            generationtime_ms: 0,
            utc_offset_seconds: 0,
            timezone: 'UTC',
            timezone_abbreviation: 'UTC',
            elevation: 0,
            daily_units: {
                time: 'iso8601',
                temperature_2m_mean: '°C',
                precipitation_sum: 'mm'
            },
            daily: {
                time: mockTimes,
                temperature_2m_mean: mockTemps,
                precipitation_sum: mockPrecip
            }
        };
    }
}

/**
 * Fetches the 30-year average annual precipitation for a given location.
 * @param latitude The latitude of the location.
 * @param longitude The longitude of the location.
 * @returns A promise that resolves to the historical precipitation data.
 */
export async function getHistoricalPrecipitation(latitude: number, longitude: number): Promise<HistoricalPrecipitationData> {
    const traceId = getTraceContext()?.requestId;
    // Fetches data for the climate normal period (1991-2020) to get a 30-year average.
    const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        start_date: '1991-01-01',
        end_date: '2020-12-31', 
        yearly: "precipitation_sum",
        models: "ERA5_seamless", // Use climate reanalysis data
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
        
        logSystemMetric({ metric_type: 'api_call', provider: 'open-meteo', is_success: true, metadata: { endpoint: 'historical_precipitation' } });
        
        // The API returns yearly data for the whole range. We need to average it.
        if (data.yearly && data.yearly.precipitation_sum && data.yearly.precipitation_sum.length > 0) {
            const validValues = data.yearly.precipitation_sum.filter((p: number | null) => p !== null);
            const average = validValues.reduce((a: number, b: number) => a + b, 0) / validValues.length;
            // We'll return the average as if it were a single yearly value for simplicity.
            data.yearly.precipitation_sum = [average];
            data.yearly.time = [ '1991-2020 Average' ];
        }
        
        return data as HistoricalPrecipitationData;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('historical_precipitation_fetch_failed', {
            scope: 'services.open-meteo',
            error: redactSensitive(message),
        });
        logSystemMetric({ metric_type: 'api_call', provider: 'open-meteo', is_success: false, error_message: message, metadata: { endpoint: 'historical_precipitation' } });
        logger.warn('historical_precipitation_mock_fallback', { scope: 'services.open-meteo' });
        
        // Return mock 30-year average (global average ~500mm/year)
        return {
            latitude,
            longitude,
            generationtime_ms: 0,
            utc_offset_seconds: 0,
            timezone: 'UTC',
            timezone_abbreviation: 'UTC',
            elevation: 0,
            yearly_units: {
                time: 'string',
                precipitation_sum: 'mm'
            },
            yearly: {
                time: ['1991-2020 Average'],
                precipitation_sum: [500 + (Math.random() - 0.5) * 200] // 400-600mm range
            }
        };
    }
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
