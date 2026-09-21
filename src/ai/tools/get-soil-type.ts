'use server';


import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Open-Meteo has no soil texture data, and this tool used to report a fixed "Loam" fallback that
// looked like a real reading. Until a real source (ISRIC SoilGrids) is wired in, report "Unknown"
// so downstream prompts do not treat a guess as a measurement.
export const getSoilType = ai.defineTool(
  {
    name: 'getSoilType',
    description: 'Returns the soil type (e.g., Loam, Clay, Sand) for a location. Returns "Unknown" when no measured soil texture is available; do not assume a soil type in that case.',
    inputSchema: z.object({
      latitude: z.number().describe('The latitude of the location.'),
      longitude: z.number().describe('The longitude of the location.'),
    }),
    outputSchema: z.object({
        soilType: z.string().describe('The determined soil type, or "Unknown" if unavailable.')
    }),
  },
  async () => ({ soilType: 'Unknown' })
);
