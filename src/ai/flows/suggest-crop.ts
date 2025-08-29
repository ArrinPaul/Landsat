
'use server';

/**
 * @fileOverview A flow for suggesting a suitable crop based on detailed farm parameters.
 *
 * - suggestCrop - A function that handles the crop suggestion process.
 * - SuggestCropInput - The input type for the suggestCrop function.
 * - SuggestCropOutput - The return type for the suggestCrop function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestCropInputSchema = z.object({
  latitude: z.number().describe('The latitude of the farm location.'),
  longitude: z.number().describe('The longitude of the farm location.'),
  soilType: z.string().describe("The farmer's description of the soil type (e.g., 'sandy loam', 'heavy clay')."),
  moistureLevel: z.enum(['Dry', 'Optimal', 'Wet']).describe('The current moisture level of the soil.'),
  climateDescription: z.string().describe("A brief description of the local climate (e.g., 'hot and arid with monsoon season', 'temperate with cold winters')."),
  currentCrop: z.string().optional().describe('The crop currently or recently grown in the field, if any.'),
});
export type SuggestCropInput = z.infer<typeof SuggestCropInputSchema>;

const SuggestCropOutputSchema = z.object({
    suggestedCrop: z.string().describe("The single most suitable crop for the given conditions."),
    suitabilityScore: z.number().min(0).max(100).describe("A percentage score (0-100) indicating how suitable the suggested crop is for the provided conditions."),
    reasoning: z.string().describe("A clear, concise explanation for the crop recommendation, detailing how factors like soil, climate, and moisture influenced the decision."),
    alternativeCrop: z.string().optional().describe("A secondary, alternative crop suggestion."),
});
export type SuggestCropOutput = z.infer<typeof SuggestCropOutputSchema>;


export async function suggestCrop(input: SuggestCropInput): Promise<SuggestCropOutput> {
  return suggestCropFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestCropPrompt',
  input: { schema: SuggestCropInputSchema },
  output: { schema: SuggestCropOutputSchema },
  prompt: `You are an expert agronomist and soil scientist advising a farmer. Your task is to recommend the best possible crop based on the specific parameters of their field. Analyze all inputs to provide a practical, well-reasoned suggestion.

  Farm Parameters:
  - Location: Latitude {{{latitude}}}, Longitude {{{longitude}}}
  - Soil Type: {{{soilType}}}
  - Soil Moisture: {{{moistureLevel}}}
  - Local Climate: {{{climateDescription}}}
  {{#if currentCrop}}
  - Previous/Current Crop: {{{currentCrop}}} (Consider crop rotation principles if applicable)
  {{/if}}

  Your analysis must result in a single, primary crop suggestion.
  1.  **Suggested Crop**: Identify the best crop for these exact conditions.
  2.  **Suitability Score**: Provide a percentage score (0-100) representing your confidence in this recommendation. A high score means the conditions are nearly perfect for that crop. A lower score might indicate some challenges.
  3.  **Reasoning**: Give a detailed but easy-to-understand explanation. Justify your choice by referencing the provided soil, moisture, and climate data. For example, explain *why* the soil type is good or bad for the crop, or how the climate affects its growth.
  4. **Alternative Crop**: Suggest one other viable crop as an alternative.
  `,
});

const suggestCropFlow = ai.defineFlow(
  {
    name: 'suggestCropFlow',
    inputSchema: SuggestCropInputSchema,
    outputSchema: SuggestCropOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
