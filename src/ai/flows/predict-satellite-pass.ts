
'use server';

/**
 * @fileOverview A flow for predicting the next satellite pass time for a given location.
 *
 * - predictSatellitePass - A function that handles the satellite pass prediction process.
 * - PredictSatellitePassInput - The input type for the predictSatellitePass function.
 * - PredictSatellitePassOutput - The return type for the predictSatellitePass function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { executePromptWithFallback, safeParseAIJson } from '@/ai/ai-utils';

const PredictSatellitePassInputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
});
export type PredictSatellitePassInput = z.infer<typeof PredictSatellitePassInputSchema>;

const PredictSatellitePassOutputSchema = z.object({
  passTime: z.string().describe('The predicted next satellite pass time in UTC ISO 8601 format.'),
  satelliteName: z.string().describe('The name of the satellite (e.g., Landsat 8, Sentinel-2).'),
  status: z.string().describe('The operational status of the satellite (e.g., Active, Maintenance).'),
  speed: z.number().describe('The orbital speed of the satellite in km/s.'),
});
export type PredictSatellitePassOutput = z.infer<typeof PredictSatellitePassOutputSchema>;

const predictSatellitePassPrompt = ai.definePrompt({
  name: 'predictSatellitePassPrompt',
  input: {schema: PredictSatellitePassInputSchema},
  prompt: `You are a satellite tracking expert. Given the coordinates, predict the next pass for a major, relevant public earth observation satellite (e.g., Landsat 9, Sentinel-2, GOES-18).

  The current date is ${new Date().toISOString()}. The returned pass time must be in the near future (within the next 24 hours).

  **Location:**
  - Latitude: {{{latitude}}}
  - Longitude: {{{longitude}}}

  Your response MUST be a valid JSON object ONLY that conforms to the PredictSatellitePassOutput schema. Do not add any other text or formatting.
`,
});

export async function predictSatellitePass(input: PredictSatellitePassInput): Promise<PredictSatellitePassOutput> {
    const response = await executePromptWithFallback(predictSatellitePassPrompt, input);
    const textResponse = response.text;

    if (!textResponse) {
      throw new Error('AI failed to generate satellite pass data.');
    }

    try {
      const parsedJson = safeParseAIJson(textResponse, (data) => PredictSatellitePassOutputSchema.parse(data));
      return parsedJson;
    } catch (e) {
      console.error("Failed to parse JSON response from AI:", textResponse);
      throw new Error("AI returned invalid JSON format. Please try again.");
    }
}
