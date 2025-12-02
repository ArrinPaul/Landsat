'use server';

/**
 * @fileOverview A flow for suggesting coordinates based on a textual description of a location.
 *
 * - suggestCoordinates - A function that handles the coordinate suggestion process.
 * - SuggestCoordinatesInput - The input type for the suggestCoordinates function.
 * - SuggestCoordinatesOutput - The return type for the suggestCoordinates function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestCoordinatesInputSchema = z.object({
  locationDescription: z
    .string()
    .describe('A textual description of a location (e.g., Amazon rainforest).'),
});
export type SuggestCoordinatesInput = z.infer<typeof SuggestCoordinatesInputSchema>;

const SuggestCoordinatesOutputSchema = z.object({
  latitude: z.number().describe('The suggested latitude for the location.'),
  longitude: z.number().describe('The suggested longitude for the location.'),
  confidence: z
    .number()
    .describe(
      'A confidence score (0-1) indicating the accuracy of the suggested coordinates.'
    ),
});
export type SuggestCoordinatesOutput = z.infer<typeof SuggestCoordinatesOutputSchema>;

const suggestCoordinatesPrompt = ai.definePrompt({
  name: 'suggestCoordinatesPrompt',
  input: {schema: SuggestCoordinatesInputSchema},
  output: {schema: SuggestCoordinatesOutputSchema},
  prompt: `You are a geography expert. Given a location description, suggest relevant latitude and longitude coordinates.

Location Description: {{{locationDescription}}}

Respond with JSON in the following format:
{
  "latitude": <latitude>,
  "longitude": <longitude>,
  "confidence": <confidence>
}

The confidence score should be between 0 and 1, indicating the accuracy of the suggested coordinates. Consider the precision of the location description when determining the confidence score. For example, a general description like 'Amazon rainforest' should have a lower confidence score than a specific address.
`,
});

export async function suggestCoordinates(input: SuggestCoordinatesInput): Promise<SuggestCoordinatesOutput> {
    const {output} = await suggestCoordinatesPrompt(input);
    if (!output) {
      throw new Error('AI failed to suggest coordinates.');
    }
    return output;
}
