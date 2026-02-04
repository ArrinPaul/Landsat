
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getSoilAndWeatherData, getMoistureLevel } from '@/services/open-meteo';
import { getCache, setCache } from '@/ai/cache';

// Simple logging function (verbose is not exported from genkit)
const verbose = (msg: string) => process.env.NODE_ENV === 'development' && console.log(msg);

export const getSoilMoisture = ai.defineTool(
  {
    name: 'getSoilMoisture',
    description: 'Returns the current soil moisture level (Dry, Optimal, or Wet) for a specific latitude and longitude by fetching real-time data from a weather and soil API.',
    inputSchema: z.object({
      latitude: z.number().describe('The latitude of the location.'),
      longitude: z.number().describe('The longitude of the location.'),
    }),
    outputSchema: z.object({
        moistureLevel: z.enum(['Dry', 'Optimal', 'Wet'])
    }),
  },
  async ({ latitude, longitude }) => {
    const cacheKey = `soil-moisture-${latitude}-${longitude}`;
    const cacheResult = getCache<{ moistureLevel: 'Dry' | 'Optimal' | 'Wet' }>(cacheKey);

    if (cacheResult.state === 'hit') {
      return cacheResult.data;
    }
    
    if (cacheResult.state === 'stale') {
      verbose(`[STALE DATA] Using stale soil moisture data for ${latitude}, ${longitude}`);
      // Non-blocking call to refresh the cache in the background
      getSoilAndWeatherData(latitude, longitude).then(data => {
        const moisture = getMoistureLevel(data.current.soil_moisture_0_to_1cm);
        setCache(cacheKey, { moistureLevel: moisture });
      }).catch(err => console.error("Failed to refresh stale cache:", err));
      return cacheResult.data;
    }

    try {
      // Fetch real data from the Open-Meteo service
      const data = await getSoilAndWeatherData(latitude, longitude);
      
      // Use the helper function to determine the moisture level
      const moisture = getMoistureLevel(data.current.soil_moisture_0_to_1cm) as 'Dry' | 'Optimal' | 'Wet';
      
      const result = { moistureLevel: moisture };
      setCache(cacheKey, result);

      return result;

    } catch (error) {
        console.error("Error in getSoilMoisture tool:", error);
        // Provide a fallback value in case of API failure to ensure the flow can continue.
        return { moistureLevel: 'Optimal' as const };
    }
  }
);
