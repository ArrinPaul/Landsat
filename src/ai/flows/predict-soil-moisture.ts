
'use server';

/**
 * @fileOverview A flow for predicting soil moisture based on location.
 *
 * - predictSoilMoisture - A function that handles the soil moisture prediction.
 * - PredictSoilMoistureInput - The input type for the predictSoilMoisture function.
 * - PredictSoilMoistureOutput - The return type for the predictSoilMoisture function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PredictSoilMoistureInputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
});
export type PredictSoilMoistureInput = z.infer<typeof PredictSoilMoistureInputSchema>;

const PredictSoilMoistureOutputSchema = z.object({
    volumetricWaterContent: z.number().describe("The predicted soil moisture as a percentage of volumetric water content (e.g., 25.5 for 25.5%)."),
    summary: z.string().describe("A brief summary of the soil moisture conditions (e.g., 'Optimal for germination', 'Slightly dry, consider irrigation')."),
    confidence: z.number().describe("A confidence score (0-1) for the prediction."),
});
export type PredictSoilMoistureOutput = z.infer<typeof PredictSoilMoistureOutputSchema>;

const predictSoilMoisturePrompt = ai.definePrompt({
  name: 'predictSoilMoisturePrompt',
  input: { schema: PredictSoilMoistureInputSchema },
  output: { schema: PredictSoilMoistureOutputSchema },
  prompt: `You are a soil scientist and hydrologist. Based on the provided latitude and longitude, analyze typical soil type for the region, recent precipitation patterns, and time of year to generate a realistic prediction of the current soil moisture at a depth of 10cm.

  The current date is ${new Date().toISOString()}.

  Your response must be a structured JSON object and include:
  1.  'volumetricWaterContent': The predicted soil moisture as a percentage (e.g., a value from 5.0 for very dry to 40.0 for saturated).
  2.  'summary': A brief, actionable summary of the conditions (e.g., "Soil is moderately dry. Irrigation may be needed...").
  3.  'confidence': A confidence score for your prediction (from 0.0 to 1.0).

  **Location:**
  - Latitude: {{{latitude}}}
  - Longitude: {{{longitude}}}

  **Example Input:**
  { "latitude": 34.05, "longitude": -118.25 }

  **Example Output (ensure this is realistic for Los Angeles, California):**
  {
    "volumetricWaterContent": 18.2,
    "summary": "Soil is moderately dry. Irrigation may be needed for sensitive crops within the next 48 hours if no rain is forecast, which is typical for this arid climate.",
    "confidence": 0.78
  }
  `,
});

export async function predictSoilMoisture(input: PredictSoilMoistureInput): Promise<PredictSoilMoistureOutput> {
    const { output } = await predictSoilMoisturePrompt(input);
    if (!output) {
      throw new Error('AI failed to generate soil moisture data.');
    }
    return output;
}
