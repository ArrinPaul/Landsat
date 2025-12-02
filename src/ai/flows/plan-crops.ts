
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
  output: { schema: PlanCropsOutputSchema },
  prompt: `You are an expert agronomist providing advice to farmers. Based on the provided latitude and longitude, analyze the typical climate, soil conditions, and agricultural context for that region to recommend a crop plan.

  The current date is ${new Date().toISOString()}. Your recommendations must be seasonally appropriate.

  Your response must be a structured JSON object and include:
  1.  A 'suitableCrops' list of 2-3 crops. For each crop, provide a clear 'name' and a 'reason' explaining why it's a good choice for the specified location (mentioning climate, soil, or market demand).
  2.  An optimal 'plantingWindow' with 'start' and 'end' dates (e.g., 'Mid-June' to 'Early-July').
  3.  A practical and creative 'cooperativeFarmingSuggestion' that could help local farmers improve their outcomes.

  **Location:**
  - Latitude: {{{latitude}}}
  - Longitude: {{{longitude}}}

  **Example Input:**
  { "latitude": 17.3850, "longitude": 78.4867 }

  **Example Output (ensure this is realistic for Hyderabad, India):**
  {
    "suitableCrops": [
        {
            "name": "Cotton",
            "reason": "The region's black soil (Vertisols) and semi-arid climate are ideal for cotton cultivation. It's a cash crop with high market demand."
        },
        {
            "name": "Sorghum (Jowar)",
            "reason": "Highly drought-tolerant and a staple food crop in the Deccan Plateau. It performs well with the expected monsoon rainfall patterns."
        },
        {
            "name": "Pigeon Pea (Tur)",
            "reason": "A hardy legume that improves soil fertility by fixing nitrogen. It's often intercropped with cotton or sorghum and is well-suited to the local climate."
        }
    ],
    "plantingWindow": {
        "start": "Mid-June",
        "end": "Early-July"
    },
    "cooperativeFarmingSuggestion": "Local farmers could form a cooperative to invest in a shared ginning and pressing facility for cotton. This would add value to their produce and allow them to sell directly to textile mills, bypassing middlemen and increasing profits."
  }
  `,
});

export async function planCrops(input: PlanCropsInput): Promise<PlanCropsOutput> {
    const { output } = await planCropsPrompt(input);
    if (!output) {
      throw new Error('AI failed to generate a crop plan.');
    }
    return output;
}
