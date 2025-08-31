
'use server';

/**
 * @fileOverview An AI tool to get the soil moisture level for a given location using a real-time API.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getSoilAndWeatherData, getMoistureLevel } from '@/services/open-meteo';

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
    try {
      // Fetch real data from the Open-Meteo service
      const data = await getSoilAndWeatherData(latitude, longitude);
      
      // Use the helper function to determine the moisture level
      const moisture = getMoistureLevel(data.current.soil_moisture_0_to_1cm);
      
      return { moistureLevel: moisture };

    } catch (error) {
        console.error("Error in getSoilMoisture tool:", error);
        // Provide a fallback value in case of API failure to ensure the flow can continue.
        return { moistureLevel: 'Optimal' };
    }
  }
);
