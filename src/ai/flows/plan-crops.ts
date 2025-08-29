
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


export async function planCrops(input: PlanCropsInput): Promise<PlanCropsOutput> {
  return planCropsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'planCropsPrompt',
  input: { schema: PlanCropsInputSchema },
  output: { schema: PlanCropsOutputSchema },
  prompt: `You are an expert agronomist providing advice to farmers. Based on the provided latitude and longitude, analyze the typical climate, soil conditions, and historical satellite data for that region to recommend a crop plan.

  The current date is ${new Date().toISOString()}.

  Your response should include:
  1.  A list of 2-3 suitable crops. For each crop, provide a brief reason why it's a good choice.
  2.  An optimal planting window (e.g., start and end dates).
  3.  A practical suggestion for cooperative farming.

  Location:
  - Latitude: {{{latitude}}}
  - Longitude: {{{longitude}}}

  Example Input:
  { "latitude": 17.3850, "longitude": 78.4867 }

  Example Output:
  {
    "suitableCrops": [
        {
            "name": "Cotton",
            "reason": "The region's black soil and semi-arid climate are ideal for cotton cultivation. It's a cash crop with high market demand."
        },
        {
            "name": "Sorghum (Jowar)",
            "reason": "Highly drought-tolerant and a staple food crop in the Deccan Plateau. It performs well with the expected rainfall patterns."
        },
        {
            "name": "Pigeon Pea (Tur)",
            "reason": "A hardy legume that improves soil fertility by fixing nitrogen. It's often intercropped with cotton or sorghum."
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

const planCropsFlow = ai.defineFlow(
  {
    name: 'planCropsFlow',
    inputSchema: PlanCropsInputSchema,
    outputSchema: PlanCropsOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
