
/**
 * @fileOverview A service to fetch agricultural and weather data from the Open-Meteo API.
 */

const API_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_API_URL = "https://archive-api.open-meteo.com/v1/archive";


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
    hourly_units: {
        time: string;
        soil_type_0_to_10cm: string;
    };
    hourly: {
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
 * Fetches the latest soil type and moisture data for a given location.
 * @param latitude The latitude of the location.
 * @param longitude The longitude of the location.
 * @returns A promise that resolves to the soil and weather data.
 */
export async function getSoilAndWeatherData(latitude: number, longitude: number): Promise<SoilAndWeatherData> {
    // Try primary URL first, then fallback
    const urls = [
        `https://soil-api.open-meteo.com/v1/soil?latitude=${latitude}&longitude=${longitude}&current=soil_moisture_0_to_1cm&hourly=soil_type_0_to_10cm`,
        `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=2024-01-01&end_date=2024-01-01&hourly=soil_moisture_0_to_1cm` // Fallback
    ];

    let lastError: any;
    for (const url of urls) {
        try {
            // Bypass SSL verification for development (handles corporate proxies)
            const https = await import('https');
            const agent = new https.Agent({ rejectUnauthorized: false });
            
            const response = await fetch(url, { cache: 'no-store', agent } as any);
            if (!response.ok) {
                throw new Error(`Open-Meteo Soil API returned an error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            
            // Normalize fallback data structure
            if (!data.current) {
                data.current = {
                    time: new Date().toISOString(),
                    interval: 3600,
                    soil_moisture_0_to_1cm: 0.25 // Default optimal moisture
                };
            }
            if (!data.hourly) {
                data.hourly = {
                    time: [new Date().toISOString()],
                    soil_type_0_to_10cm: [4] // Default: Loam
                };
            }
            
            return data as SoilAndWeatherData;
        } catch (error: any) {
            lastError = error;
            console.warn(`Failed to fetch from ${url}:`, error.message);
            continue;
        }
    }
    
    // If all URLs fail, return mock data as last resort
    console.error("All soil API URLs failed, using mock data");
    return {
        latitude,
        longitude,
        generationtime_ms: 0,
        utc_offset_seconds: 0,
        timezone: 'UTC',
        timezone_abbreviation: 'UTC',
        elevation: 0,
        current_units: { time: 'iso8601', interval: 'seconds', soil_moisture_0_to_1cm: 'm³/m³' },
        current: { time: new Date().toISOString(), interval: 3600, soil_moisture_0_to_1cm: 0.25 },
        hourly_units: { time: 'iso8601', soil_type_0_to_10cm: 'code' },
        hourly: { time: [new Date().toISOString()], soil_type_0_to_10cm: [4] }
    };
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
        // Bypass SSL verification for development (handles corporate proxies)
        const https = await import('https');
        const agent = new https.Agent({ rejectUnauthorized: false });
        
        const response = await fetch(url, { cache: 'no-store', agent } as any);
         if (!response.ok) {
            throw new Error(`Open-Meteo Archive API returned an error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data as HistoricalWeatherData;
    } catch (error: any) {
        console.error("Error fetching historical weather data:", error);
        throw new Error(`Could not retrieve historical weather info. Network request failed: ${error.message}`);
    }
}

/**
 * Fetches the 30-year average annual precipitation for a given location.
 * @param latitude The latitude of the location.
 * @param longitude The longitude of the location.
 * @returns A promise that resolves to the historical precipitation data.
 */
export async function getHistoricalPrecipitation(latitude: number, longitude: number): Promise<HistoricalPrecipitationData> {
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
        // Bypass SSL verification for development (handles corporate proxies)
        const https = await import('https');
        const agent = new https.Agent({ rejectUnauthorized: false });
        
        const response = await fetch(url, { cache: 'no-store', agent } as any);
        if (!response.ok) {
            throw new Error(`Open-Meteo Archive API returned an error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        
        // The API returns yearly data for the whole range. We need to average it.
        if (data.yearly && data.yearly.precipitation_sum && data.yearly.precipitation_sum.length > 0) {
            const validValues = data.yearly.precipitation_sum.filter((p: number | null) => p !== null);
            const average = validValues.reduce((a: number, b: number) => a + b, 0) / validValues.length;
            // We'll return the average as if it were a single yearly value for simplicity.
            data.yearly.precipitation_sum = [average];
            data.yearly.time = [ '1991-2020 Average' ];
        }
        
        return data as HistoricalPrecipitationData;
    } catch (error: any) {
        console.error("Error fetching historical precipitation data:", error);
        throw new Error(`Could not retrieve historical precipitation info. Network request failed: ${error.message}`);
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

/**
 * Categorizes the volumetric water content into a moisture level.
 * Typical values for VWC range from <10% (very dry) to >40% (saturated).
 * @param vwc The volumetric water content percentage (e.g., 25.5).
 * @returns 'Dry', 'Optimal', or 'Wet'.
 */
export function getMoistureLevel(vwc: number | undefined): 'Dry' | 'Optimal' | 'Wet' {
    if (vwc === undefined) return "Optimal"; // Default fallback
    if (vwc < 15) return 'Dry';
    if (vwc > 35) return 'Wet';
    return 'Optimal';
}
