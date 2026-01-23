
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
import { executePromptWithFallback, safeParseAIJson } from '@/ai/ai-utils';

const PredictCropYieldInputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
  cropType: z.string().default('Maize').describe('The type of crop to predict the yield for.'),
});
export type PredictCropYieldInput = z.infer<typeof PredictCropYieldInputSchema>;

const PredictCropYieldOutputSchema = z.object({
    predictedYield: z.number().describe("The predicted crop yield in tons per hectare."),
    crop: z.string().describe("The crop for which the yield is predicted."),
    confidence: z.number().min(0).max(1).describe("A confidence score (0-1) for the prediction."),
    notes: z.string().describe("Additional context or factors influencing the yield prediction."),
});
export type PredictCropYieldOutput = z.infer<typeof PredictCropYieldOutputSchema>;

const predictCropYieldPrompt = ai.definePrompt({
  name: 'predictCropYieldPrompt',
  input: { schema: PredictCropYieldInputSchema },
  prompt: `You are an agricultural scientist specializing in crop yield prediction. Based on the provided latitude, longitude, and crop type, analyze known climate patterns, typical soil data, and regional agricultural productivity to predict the potential crop yield.

  The current date is ${new Date().toISOString()}.

  Your response MUST be a valid JSON object ONLY that conforms to the PredictCropYieldOutput schema. Do not add any other text or formatting.

  **Location & Crop:**
  - Latitude: {{{latitude}}}
  - Longitude: {{{longitude}}}
  - Crop Type: {{{cropType}}}
  `,
});

export async function predictCropYield(input: PredictCropYieldInput): Promise<PredictCropYieldOutput> {
    const response = await executePromptWithFallback(predictCropYieldPrompt, input);
    const textResponse = response.text;
    
    if (!textResponse) {
        throw new Error("The AI model did not return a crop yield prediction.");
    }
    
    try {
        const parsedJson = safeParseAIJson(textResponse, (data) => PredictCropYieldOutputSchema.parse(data));
        return parsedJson;
    } catch(e) {
        console.error("Failed to parse JSON response from AI:", textResponse);
        throw new Error("AI returned invalid JSON format. Please try again.");
    }
}
