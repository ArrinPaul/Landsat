
'use server';

/**
 * @fileOverview A flow for analyzing drought and flood risk for a given location.
 * - analyzeDroughtAndFloodRisk - A function that provides a risk assessment.
 * - DroughtFloodRiskInput - The input type for the function.
 * - DroughtFloodRiskOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getDroughtAndFloodRiskData } from '@/ai/tools/get-drought-flood-risk-data';

const DroughtFloodRiskInputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
});
export type DroughtFloodRiskInput = z.infer<typeof DroughtFloodRiskInputSchema>;

const DroughtFloodRiskOutputSchema = z.object({
    droughtRisk: z.enum(['Low', 'Medium', 'High']).describe("The assessed risk level for drought."),
    floodRisk: z.enum(['Low', 'Medium', 'High']).describe("The assessed risk level for flooding."),
    summary: z.string().describe("A concise summary explaining the key factors influencing the risk assessment, explicitly mentioning the fetched historical precipitation and recent soil moisture data."),
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
  tools: [getDroughtAndFloodRiskData],
  prompt: `You are an expert hydrologist and climate scientist AI. Your task is to assess the drought and flood risk for a specific geographic location using real-time data.

  **Process:**
  1.  **Mandatory Data Fetching**: You MUST use the 'getDroughtAndFloodRiskData' tool to get real-world data for the given coordinates. This tool will provide you with the 30-year average annual precipitation and the current soil moisture level. Do not guess or use generalized knowledge.
  2.  **Analysis**: Synthesize the fetched data with your knowledge of the location's topography, proximity to water bodies, and climate zone to make your assessment.
      - A much lower-than-average precipitation and 'Dry' soil moisture suggests a high drought risk.
      - A much higher-than-average precipitation and 'Wet' soil moisture, especially in a low-lying area, suggests a high flood risk.
  3.  **Output Generation**: Based on your analysis, provide a structured JSON response.

  **Location:**
  - Latitude: {{{latitude}}}
  - Longitude: {{{longitude}}}
  
  **Output Requirements:**
  Your response must be a structured JSON object containing:
  1.  'droughtRisk': Assessed drought risk as 'Low', 'Medium', or 'High'.
  2.  'floodRisk': Assessed flood risk as 'Low', 'Medium', or 'High'.
  3.  'summary': A concise explanation for your ratings. You MUST explicitly reference the fetched precipitation and soil moisture data in your summary.
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
