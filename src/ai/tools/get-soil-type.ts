
'use server';

/**
 * @fileOverview An AI tool to get the likely soil type for a given location.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const getSoilType = ai.defineTool(
  {
    name: 'getSoilType',
    description: 'Returns the likely soil type (e.g., Loam, Clay, Sand) for a specific latitude and longitude based on geological and soil survey data.',
    inputSchema: z.object({
      latitude: z.number().describe('The latitude of the location.'),
      longitude: z.number().describe('The longitude of the location.'),
    }),
    outputSchema: z.object({
        soilType: z.string().describe('The determined soil type.')
    }),
  },
  async ({ latitude, longitude }) => {
    // This is a simplified mock. A real implementation would query a soil database API
    // like the USDA Web Soil Survey, ISRIC SoilGrids, etc.
    // We'll simulate some common soil types based on broad geographical regions.

    if (latitude > 25 && latitude < 50 && longitude > -125 && longitude < -65) {
      return { soilType: 'Loam (Mollisols)' }; // North America Midwest
    }
    if (latitude > -10 && latitude < 10 && longitude > -80 && longitude < -40) {
      return { soilType: 'Clay (Oxisols)' }; // Amazon Basin
    }
    if (latitude > 20 && latitude < 30 && longitude > 70 && longitude < 85) {
        return { soilType: 'Alluvial Soil' }; // Indo-Gangetic Plain
    }
    if (latitude > 25 && latitude < 35 && longitude > 25 && longitude < 35) {
      return { soilType: 'Sandy Soil (Aridisols)' }; // Sahara region
    }
    
    // Default fallback
    return { soilType: 'Loam' };
  }
);
