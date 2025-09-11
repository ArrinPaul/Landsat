
'use server';

/**
 * @fileOverview A flow for analyzing drought and flood risk for a given location.
 * - analyzeDroughtAndFloodRisk - A function that provides a risk assessment.
 * - DroughtFloodRiskInput - The input type for the function.
 * - DroughtFloodRiskOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DroughtFloodRiskInputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
});
export type DroughtFloodRiskInput = z.infer<typeof DroughtFloodRiskInputSchema>;

const DroughtFloodRiskOutputSchema = z.object({
    droughtRisk: z.enum(['Low', 'Medium', 'High']).describe("The assessed risk level for drought."),
    floodRisk: z.enum(['Low', 'Medium', 'High']).describe("The assessed risk level for flooding."),
    summary: z.string().describe("A concise summary explaining the key factors influencing the risk assessment, such as typical climate patterns, topography, and historical water index data."),
    confidence: z.number().min(0).max(1).describe("A confidence score (0-1) for the overall risk assessment."),
});
export type DroughtFloodRiskOutput = z.infer<typeof DroughtFloodRiskOutputSchema>;


export async function analyzeDroughtAndFloodRisk(input: DroughtFloodRiskInput): Promise<DroughtFloodRiskOutput> {
  return analyzeDroughtAndFloodRiskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'droughtFloodRiskPrompt',
  input: { schema: DroughtFloodRiskInputSchema },
  output: { schema: DroughtFloodRiskOutputSchema },
  prompt: `You are an expert hydrologist and climate scientist AI. Your task is to assess the drought and flood risk for a specific geographic location.

  **Analysis Factors:**
  To make your assessment, consider the following based on the provided coordinates:
  1.  **Historical Precipitation**: The typical annual rainfall and its seasonality.
  2.  **Topography**: The general elevation and terrain (e.g., is it a low-lying delta, a mountainous region, or a flat plain?).
  3.  **Proximity to Water Bodies**: Is it near a major river, lake, or coastline?
  4.  **Soil Type & Land Cover**: The general soil characteristics (e.g., sandy vs. clay) and vegetation cover, which affect water absorption and runoff.
  5.  **Climate Zone**: The broader climate classification (e.g., arid, tropical monsoon, temperate).
  
  **Location:**
  - Latitude: {{{latitude}}}
  - Longitude: {{{longitude}}}

  **Output Requirements:**
  Based on your analysis, provide a structured JSON response with:
  1.  'droughtRisk': Assessed drought risk as 'Low', 'Medium', or 'High'.
  2.  'floodRisk': Assessed flood risk as 'Low', 'Medium', or 'High'.
  3.  'summary': A concise explanation for your ratings, referencing the factors you considered.
  4.  'confidence': Your confidence level (0.0 to 1.0) in this assessment.
  `,
});

const analyzeDroughtAndFloodRiskFlow = ai.defineFlow(
  {
    name: 'analyzeDroughtAndFloodRiskFlow',
    inputSchema: DroughtFloodRiskInputSchema,
    outputSchema: DroughtFloodRiskOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    
    if (!output) {
      throw new Error("The AI model did not return a risk analysis output. Please try again.");
    }
    
    return output;
  }
);
