
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

export async function scheduleIrrigation(input: ScheduleIrrigationInput): Promise<ScheduleIrrigationOutput> {
  return scheduleIrrigationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'scheduleIrrigationPrompt',
  input: { schema: ScheduleIrrigationInputSchema },
  output: { schema: ScheduleIrrigationOutputSchema },
  prompt: `You are an agricultural water management specialist. Based on the provided latitude and longitude, analyze simulated soil moisture, local climate patterns, and typical crop water needs for the region to provide a realistic irrigation recommendation.

  The current date is ${new Date().toISOString()}.

  Your response must be a structured JSON object and include:
  1.  A clear 'recommendation' (e.g., "Irrigate within 24 hours," "No irrigation needed for 5-7 days").
  2.  The suggested 'nextIrrigationDate' in YYYY-MM-DD format.
  3.  The recommended 'wateringDepthInches'.
  4.  A brief 'notes' section explaining your reasoning, referencing factors like recent weather patterns or soil type.

  **Location:**
  - Latitude: {{{latitude}}}
  - Longitude: {{{longitude}}}

  **Example Input:**
  { "latitude": 28.4595, "longitude": 77.0266 }

  **Example Output (ensure this is realistic for Gurgaon, India, and considers monsoon season):**
  {
    "recommendation": "Delay irrigation",
    "nextIrrigationDate": "${new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}",
    "wateringDepthInches": 1.5,
    "notes": "No irrigation needed for 5-7 days. The region is currently in its monsoon season, and recent showers have likely replenished soil moisture. NDWI values are typically high during this period."
  }
  `,
});


const scheduleIrrigationFlow = ai.defineFlow(
  {
    name: 'scheduleIrrigationFlow',
    inputSchema: ScheduleIrrigationInputSchema,
    outputSchema: ScheduleIrrigationOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
