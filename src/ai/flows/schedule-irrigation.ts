
'use server';

/**
 * @fileOverview A flow for creating an irrigation schedule based on location.
 *
 * - scheduleIrrigation - A function that handles the irrigation scheduling process.
 * - ScheduleIrrigationInput - The input type for the scheduleIrrigation function.
 * - ScheduleIrrigationOutput - The return type for the scheduleIrrigation function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { executePromptWithFallback, safeParseAIJson } from '@/ai/ai-utils';

const ScheduleIrrigationInputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
});
export type ScheduleIrrigationInput = z.infer<typeof ScheduleIrrigationInputSchema>;


const ScheduleIrrigationOutputSchema = z.object({
    recommendation: z.string().describe("A concise, actionable irrigation recommendation (e.g., 'Irrigate now', 'Delay irrigation')."),
    nextIrrigationDate: z.string().describe("The suggested date for the next irrigation event in YYYY-MM-DD format."),
    wateringDepthInches: z.number().describe("The recommended depth of watering in inches."),
    notes: z.string().describe("Additional context or reasoning for the recommendation, considering recent weather and soil moisture data."),
});
export type ScheduleIrrigationOutput = z.infer<typeof ScheduleIrrigationOutputSchema>;


const scheduleIrrigationPrompt = ai.definePrompt({
  name: 'scheduleIrrigationPrompt',
  input: { schema: ScheduleIrrigationInputSchema },
  prompt: `You are an agricultural water management specialist. Based on the provided latitude and longitude, analyze simulated soil moisture, local climate patterns, and typical crop water needs for the region to provide a realistic irrigation recommendation.

  The current date is ${new Date().toISOString()}.

  Your response MUST be a valid JSON object ONLY that conforms to the ScheduleIrrigationOutput schema. Do not add any other text or formatting.

  **Location:**
  - Latitude: {{{latitude}}}
  - Longitude: {{{longitude}}}
  `,
});

export async function scheduleIrrigation(input: ScheduleIrrigationInput): Promise<ScheduleIrrigationOutput> {
    const response = await executePromptWithFallback(scheduleIrrigationPrompt, input);
    const textResponse = response.text;
    if (!textResponse) {
      throw new Error('AI failed to generate an irrigation schedule.');
    }
    
    try {
        const parsedJson = safeParseAIJson(textResponse, (data) => ScheduleIrrigationOutputSchema.parse(data));
        return parsedJson;
    } catch (e) {
        console.error("Failed to parse JSON response from AI:", textResponse);
        throw new Error("AI returned invalid JSON format. Please try again.");
    }
}
