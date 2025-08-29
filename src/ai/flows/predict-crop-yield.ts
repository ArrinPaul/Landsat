
'use server';

/**
 * @fileOverview A flow for predicting crop yield based on location.
 *
 * - predictCropYield - A function that handles the crop yield prediction process.
 * - PredictCropYieldInput - The input type for the predictCropYield function.
 * - PredictCropYieldOutput - The return type for the predictCropYield function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PredictCropYieldInputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
  cropType: z.string().default('Maize').describe('The type of crop to predict the yield for.'),
});
export type PredictCropYieldInput = z.infer<typeof PredictCropYieldInputSchema>;

const PredictCropYieldOutputSchema = z.object({
    predictedYield: z.number().describe("The predicted crop yield in tons per hectare."),
    crop: z.string().describe("The crop for which the yield is predicted."),
    confidence: z.number().describe("A confidence score (0-1) for the prediction."),
    notes: z.string().describe("Additional context or factors influencing the yield prediction."),
});
export type PredictCropYieldOutput = z.infer<typeof PredictCropYieldOutputSchema>;

export async function predictCropYield(input: PredictCropYieldInput): Promise<PredictCropYieldOutput> {
  return predictCropYieldFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictCropYieldPrompt',
  input: { schema: PredictCropYieldInputSchema },
  output: { schema: PredictCropYieldOutputSchema },
  prompt: `You are an agricultural scientist specializing in crop yield prediction. Based on the provided latitude, longitude, and crop type, analyze historical satellite data (NDVI), climate patterns, and typical soil data to predict the potential crop yield.

  The current date is ${new Date().toISOString()}.

  Your response should include:
  1.  The predicted yield in tons per hectare.
  2.  The crop name.
  3.  A confidence score for your prediction (0 to 1).
  4.  A brief note explaining the key factors influencing this prediction (e.g., expected rainfall, soil quality, temperature trends).

  Location:
  - Latitude: {{{latitude}}}
  - Longitude: {{{longitude}}}
  - Crop Type: {{{cropType}}}

  Example Input:
  { "latitude": 41.6, "longitude": -93.6, "cropType": "Corn" }

  Example Output:
  {
    "predictedYield": 12.5,
    "crop": "Corn",
    "confidence": 0.85,
    "notes": "The prediction is based on the location's highly fertile Mollisol soils and historically consistent rainfall during the growing season. The forecast suggests slightly warmer than average temperatures, which could positively impact yield if moisture is sufficient."
  }
  `,
});

const predictCropYieldFlow = ai.defineFlow(
  {
    name: 'predictCropYieldFlow',
    inputSchema: PredictCropYieldInputSchema,
    outputSchema: PredictCropYieldOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
