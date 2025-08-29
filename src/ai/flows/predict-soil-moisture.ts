
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

export async function predictSoilMoisture(input: PredictSoilMoistureInput): Promise<PredictSoilMoistureOutput> {
  return predictSoilMoistureFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictSoilMoisturePrompt',
  input: { schema: PredictSoilMoistureInputSchema },
  output: { schema: PredictSoilMoistureOutputSchema },
  prompt: `You are a soil scientist. Based on the provided latitude and longitude, analyze recent satellite data (e.g., Sentinel-1 for radar backscatter), recent precipitation data, and soil type information to predict the current soil moisture at a depth of 10cm.

  The current date is ${new Date().toISOString()}.

  Your response should include:
  1.  The predicted volumetric water content as a percentage.
  2.  A brief, actionable summary of the conditions.
  3.  A confidence score for your prediction (0 to 1).

  Location:
  - Latitude: {{{latitude}}}
  - Longitude: {{{longitude}}}

  Example Input:
  { "latitude": 34.05, "longitude": -118.25 }

  Example Output:
  {
    "volumetricWaterContent": 18.2,
    "summary": "Soil is moderately dry. Irrigation may be needed for sensitive crops within the next 48 hours if no rain is forecast.",
    "confidence": 0.78
  }
  `,
});

const predictSoilMoistureFlow = ai.defineFlow(
  {
    name: 'predictSoilMoistureFlow',
    inputSchema: PredictSoilMoistureInputSchema,
    outputSchema: PredictSoilMoistureOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
