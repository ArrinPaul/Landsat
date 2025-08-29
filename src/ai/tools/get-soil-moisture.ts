
'use server';

/**
 * @fileOverview An AI tool to get the soil moisture level for a given location.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const getSoilMoisture = ai.defineTool(
  {
    name: 'getSoilMoisture',
    description: 'Returns the current soil moisture level (Dry, Optimal, or Wet) for a specific latitude and longitude based on recent satellite and weather data.',
    inputSchema: z.object({
      latitude: z.number().describe('The latitude of the location.'),
      longitude: z.number().describe('The longitude of the location.'),
    }),
    outputSchema: z.object({
        moistureLevel: z.enum(['Dry', 'Optimal', 'Wet'])
    }),
  },
  async ({ latitude, longitude }) => {
    // In a real application, this would involve a complex model using satellite data (e.g., SMAP, Sentinel-1)
    // and weather data. For this prototype, we'll simulate it based on location.
    
    // Simulate moisture based on latitude and longitude (more varied than before)
    if (latitude > 20 && latitude < 35 && longitude > 68 && longitude < 97) { // Indian subcontinent
        return { moistureLevel: 'Optimal' }; // Monsoon influence
    } else if (latitude > 30 && latitude < 50 && longitude > -125 && longitude < -95) { // Western US
        return { moistureLevel: 'Dry' };
    } else if (Math.abs(latitude) < 10 && longitude > -80 && longitude < -50) { // Amazon
        return { moistureLevel: 'Wet' };
    } else if (latitude > 35 && latitude < 55 && longitude > 0 && longitude < 30) { // Europe
        return { moistureLevel: 'Optimal' };
    } else if (latitude > 20 && latitude < 35 && longitude > 15 && longitude < 55) { // Sahara/Middle East
        return { moistureLevel: 'Dry' };
    }

    // Default fallback
    return { moistureLevel: 'Optimal' };
  }
);
