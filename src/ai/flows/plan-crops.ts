
'use server';

/**
 * @fileOverview A flow for suggesting crop plans based on location.
 *
 * - planCrops - A function that handles the crop planning process.
 * - PlanCropsInput - The input type for the planCrops function.
 * - PlanCropsOutput - The return type for the planCrops function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PlanCropsInputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
});
export type PlanCropsInput = z.infer<typeof PlanCropsInputSchema>;

const CropSchema = z.object({
    name: z.string().describe("The common name of the crop."),
    reason: z.string().describe("A brief explanation of why this crop is suitable for the location and conditions."),
});

const PlanCropsOutputSchema = z.object({
    suitableCrops: z.array(CropSchema).describe("A list of crops suitable for planting at the given location."),
    plantingWindow: z.object({
        start: z.string().describe("The suggested start date for planting (e.g., 'Mid-April')."),
        end: z.string().describe("The suggested end date for planting (e.g., 'Late-May').")
    }).describe("The optimal window for planting the suggested crops."),
    cooperativeFarmingSuggestion: z.string().describe("A suggestion for how local farmers could cooperate for better yield or market access."),
});
export type PlanCropsOutput = z.infer<typeof PlanCropsOutputSchema>;

const planCropsPrompt = ai.definePrompt({
  name: 'planCropsPrompt',
  input: { schema: PlanCropsInputSchema },
  prompt: `You are an expert agronomist providing advice to farmers. Based on the provided latitude and longitude, analyze the typical climate, soil conditions, and agricultural context for that region to recommend a crop plan.

  The current date is ${new Date().toISOString()}. Your recommendations must be seasonally appropriate.

  Your response MUST be a valid JSON object ONLY that conforms to the PlanCropsOutput schema. Do not add any other text or formatting.

  **Location:**
  - Latitude: {{{latitude}}}
  - Longitude: {{{longitude}}}
  `,
});

export async function planCrops(input: PlanCropsInput): Promise<PlanCropsOutput> {
    const response = await planCropsPrompt(input);
    const textResponse = response.text;
    if (!textResponse) {
      throw new Error('AI failed to generate a crop plan.');
    }

    try {
        const parsedJson = JSON.parse(textResponse);
        return PlanCropsOutputSchema.parse(parsedJson);
    } catch(e) {
        console.error("Failed to parse JSON response from AI:", textResponse);
        throw new Error("AI returned invalid JSON format.");
    }
}
