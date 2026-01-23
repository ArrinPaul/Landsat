
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
import { executePromptWithFallback, safeParseAIJson } from '@/ai/ai-utils';

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
  prompt: `You are a soil scientist and hydrologist. Based on the provided latitude and longitude, analyze typical soil type for the region, recent precipitation patterns, and time of year to generate a realistic prediction of the current soil moisture at a depth of 10cm.

  The current date is ${new Date().toISOString()}.

  Your response MUST be a valid JSON object ONLY that conforms to the PredictSoilMoistureOutput schema. Do not add any other text or formatting.

  **Location:**
  - Latitude: {{{latitude}}}
  - Longitude: {{{longitude}}}
  `,
});

export async function predictSoilMoisture(input: PredictSoilMoistureInput): Promise<PredictSoilMoistureOutput> {
    const response = await executePromptWithFallback(predictSoilMoisturePrompt, input);
    const textResponse = response.text;
    if (!textResponse) {
      throw new Error('AI failed to generate soil moisture data.');
    }
    try {
        const parsedJson = safeParseAIJson(textResponse, (data) => PredictSoilMoistureOutputSchema.parse(data));
        return parsedJson;
    } catch(e) {
        console.error("Failed to parse JSON response from AI:", textResponse);
        throw new Error("AI returned invalid JSON format. Please try again.");
    }
}
