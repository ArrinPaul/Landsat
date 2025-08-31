/**
 * @fileOverview A service to fetch agricultural data from the Open-Meteo API.
 */

// API Documentation: https://open-meteo.com/en/docs/soil_and_weather_api
const API_URL = "https://soil-api.open-meteo.com/v1/soil";

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


/**
 * Fetches the latest soil type and moisture data for a given location.
 * @param latitude The latitude of the location.
 * @param longitude The longitude of the location.
 * @returns A promise that resolves to the soil and weather data.
 */
export async function getSoilAndWeatherData(latitude: number, longitude: number): Promise<SoilAndWeatherData> {
    const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        current: "soil_moisture_0_to_1cm",
        hourly: "soil_type_0_to_10cm",
    });

    const url = `${API_URL}?${params.toString()}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch data from Open-Meteo: ${response.statusText}`);
        }
        const data = await response.json();
        return data as SoilAndWeatherData;
    } catch (error) {
        console.error("Error fetching soil and weather data:", error);
        throw new Error("Could not retrieve real-time soil and weather information.");
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
