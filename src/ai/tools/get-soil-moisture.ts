
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
    // For example, drier regions vs. wetter regions.
    
    // Simulate moisture based on latitude (very coarse approximation)
    if (Math.abs(latitude) < 20) { // Tropical regions
        return { moistureLevel: 'Optimal' };
    } else if (Math.abs(latitude) >= 20 && Math.abs(latitude) < 40) { // Sub-tropical/desert regions
        return { moistureLevel: 'Dry' };
    } else { // Temperate regions
        return { moistureLevel: 'Optimal' };
    }
  }
);
