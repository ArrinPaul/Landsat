
'use server';

/**
 * @fileOverview A flow for providing advanced, crop-specific agricultural advice.
 * This flow uses tools to fetch real-time soil data before making recommendations.
 * - getAdvancedCropAdvice - A function that provides detailed advice for a specific crop.
 * - AdvancedCropAdviceInput - The input type for the function.
 * - AdvancedCropAdviceOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { getSoilMoisture } from '@/ai/tools/get-soil-moisture';
import { getSoilType } from '@/ai/tools/get-soil-type';
import { z } from 'genkit';
import type { AdvancedCropAdvice } from '@/lib/types';
import { executePromptWithFallback, safeParseAIJson } from '@/ai/ai-utils';

const AdvancedCropAdviceInputSchema = z.object({
  latitude: z.number().describe('The latitude of the farm location.'),
  longitude: z.number().describe('The longitude of the farm location.'),
  climateDescription: z.string().describe("A brief description of the local climate."),
  crop: z.string().describe('The specific crop for which advice is being sought (e.g., "Corn", "Wheat").'),
  language: z.string().optional().default('en').describe('The language for the output reasoning (e.g., "en", "hi", "es").'),
});
export type AdvancedCropAdviceInput = z.infer<typeof AdvancedCropAdviceInputSchema>;


const PestOrDiseaseRiskSchema = z.object({
    name: z.string().describe("The common name of the pest or disease."),
    description: z.string().describe("A brief description of the risk and potential mitigation strategies."),
});

const FertilizationStrategySchema = z.object({
    timing: z.string().describe("The recommended timing for application (e.g., 'At planting', 'At tillering stage')."),
    recommendation: z.string().describe("The specific fertilizer recommendation (e.g., 'Apply a balanced NPK fertilizer')."),
});

const AdvancedCropAdviceOutputSchema = z.object({
    crop: z.string(),
    plantingDensity: z.object({
        value: z.number().describe("The numerical value for planting density."),
        unit: z.string().describe("The unit for planting density, e.g., 'seeds/hectare' or 'plants/sq. meter'."),
    }),
    pestAndDiseaseRisks: z.array(PestOrDiseaseRiskSchema).describe("A list of 2-3 potential pest and disease risks for the crop in this region."),
    fertilizationStrategy: z.array(FertilizationStrategySchema).describe("A list of key fertilization recommendations for different growth stages."),
    notes: z.string().describe("A summary note that ties the advice together, explicitly mentioning the fetched soil and moisture data."),
});
export type AdvancedCropAdviceOutput = z.infer<typeof AdvancedCropAdviceOutputSchema>;


const getAdvancedCropAdvicePrompt = ai.definePrompt({
  name: 'advancedCropAdvicePrompt',
  input: { schema: AdvancedCropAdviceInputSchema },
  tools: [getSoilMoisture, getSoilType],
  prompt: `You are a world-class agronomist AI, providing detailed, actionable advice to a farmer.
  Your task is to generate a specialized plan for a specific crop using real-time data.

  **Process:**
  1.  **Mandatory Data Fetching**: You MUST use the 'getSoilType' and 'getSoilMoisture' tools for the given coordinates to get real-world data. Do not guess.
  2.  **Synthesize and Advise**: Combine the fetched soil/moisture data with the farmer's climate description and the specific needs of the selected crop to generate your advice.
  3.  **Language**: All descriptive text in your output (descriptions, recommendations, notes) MUST be in the requested language: {{{language}}}.

  **Farm Parameters:**
  - Crop: {{{crop}}}
  - Location: Latitude {{{latitude}}}, Longitude {{{longitude}}}
  - Local Climate: {{{climateDescription}}}
  - Output Language: {{{language}}}

  **Output Requirements:**
  Your response MUST be a valid JSON object ONLY that conforms to the schema of the 'AdvancedCropAdviceOutput' type. Do not include any other text or formatting.
  `,
});

export async function getAdvancedCropAdvice(input: AdvancedCropAdviceInput): Promise<AdvancedCropAdvice> {
    const response = await executePromptWithFallback(getAdvancedCropAdvicePrompt, input);
    const textResponse = response.text;
    
    if (!textResponse) {
      throw new Error("The AI model did not return an output for advanced crop advice. Please try again.");
    }

    try {
        const parsedJson = safeParseAIJson(textResponse, (data) => AdvancedCropAdviceOutputSchema.parse(data));
        return parsedJson;
    } catch (e) {
        console.error("Failed to parse JSON response from AI:", textResponse);
        throw new Error("AI returned invalid JSON format. Please try again.");
    }
}
