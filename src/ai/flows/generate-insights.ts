// This file uses server-side code, marking it with 'use server'.
'use server';

/**
 * @fileOverview AI-powered insights generator for environmental data.
 *
 * - generateDataInsights - A function that generates insights about the data.
 * - GenerateDataInsightsInput - The input type for the generateDataInsights function.
 * - GenerateDataInsightsOutput - The return type for the generateDataInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDataInsightsInputSchema = z.object({
  metricName: z.string().describe('The name of the metric.'),
  firstValue: z.number().describe('The first value of the metric.'),
  lastValue: z.number().describe('The last value of the metric.'),
  percentageChange: z.number().describe('The percentage change of the metric.'),
  numberOfValidPoints: z.number().describe('The number of valid data points for the metric.'),
});
export type GenerateDataInsightsInput = z.infer<typeof GenerateDataInsightsInputSchema>;

const GenerateDataInsightsOutputSchema = z.object({
  insight: z.string().describe('The generated insight about the data.'),
});
export type GenerateDataInsightsOutput = z.infer<typeof GenerateDataInsightsOutputSchema>;

const generateDataInsightsPrompt = ai.definePrompt({
  name: 'generateDataInsightsPrompt',
  input: {schema: GenerateDataInsightsInputSchema},
  output: {schema: GenerateDataInsightsOutputSchema},
  prompt: `You are an AI assistant that analyzes environmental metrics and generates insights.

  Given the following data, provide a concise insight about the data, such as anomalies or significant trends.

  Metric Name: {{{metricName}}}
  First Value: {{{firstValue}}}
  Last Value: {{{lastValue}}}
  Percentage Change: {{{percentageChange}}}
  Number of Valid Points: {{{numberOfValidPoints}}}

  Insight: `,
});

export async function generateDataInsights(input: GenerateDataInsightsInput): Promise<GenerateDataInsightsOutput> {
    const {output} = await generateDataInsightsPrompt(input);
    if (!output) {
      throw new Error('AI failed to generate an insight.');
    }
    return output;
}
