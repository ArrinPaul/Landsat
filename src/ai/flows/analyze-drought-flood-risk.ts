
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
import { executePromptWithFallback, safeParseAIJson } from '@/ai/ai-utils';

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


const analyzeDroughtAndFloodRiskPrompt = ai.definePrompt({
  name: 'droughtFloodRiskPrompt',
  input: { schema: DroughtFloodRiskInputSchema },
  tools: [getDroughtAndFloodRiskData],
  prompt: `You are an expert hydrologist and climate scientist AI. Your task is to assess the drought and flood risk for a specific geographic location using real-time data.

  **Process:**
  1.  **Mandatory Data Fetching**: You MUST use the 'getDroughtAndFloodRiskData' tool to get real-world data for the given coordinates. This tool provides REAL 30-year precipitation averages and current soil moisture.
  2.  **Analysis Rules - Use ONLY real data, DO NOT make up values**:
      - Drought Risk: Compare current vs 30-year average
        * <50% of average precipitation + 'Dry' soil → HIGH risk
        * 50-80% of average + 'Dry'/'Optimal' soil → MEDIUM risk
        * >80% of average → LOW risk
      - Flood Risk: 
        * >150% of average precipitation + 'Wet' soil → HIGH risk
        * 120-150% of average + 'Wet' soil → MEDIUM risk
        * <120% of average → LOW risk
  3.  **Output Generation**: Based ONLY on the REAL data fetched, provide a structured JSON response.

  **Location:**
  - Latitude: {{{latitude}}}
  - Longitude: {{{longitude}}}
  
  **Output Requirements:**
  Your response MUST be a valid JSON object ONLY. Do not include any other text or formatting. Your response must conform to the following JSON schema:
  {
    "type": "object",
    "properties": {
        "droughtRisk": { "type": "string", "enum": ["Low", "Medium", "High"] },
        "floodRisk": { "type": "string", "enum": ["Low", "Medium", "High"] },
        "summary": { "type": "string" },
        "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
    },
    "required": ["droughtRisk", "floodRisk", "summary", "confidence"]
  }
  `,
});

export async function analyzeDroughtAndFloodRisk(input: DroughtFloodRiskInput): Promise<DroughtFloodRiskOutput> {
    const response = await executePromptWithFallback(analyzeDroughtAndFloodRiskPrompt, input, undefined, 'drought-flood');
    const textResponse = response.text;
    
    if (!textResponse) {
      throw new Error("The AI model did not return a risk analysis output. Please try again.");
    }
    
    try {
        const parsedJson = safeParseAIJson(textResponse, (data) => DroughtFloodRiskOutputSchema.parse(data));
        return parsedJson;
    } catch (e) {
        console.error("Failed to parse JSON response from AI:", textResponse);
        throw new Error("AI returned invalid JSON format. Please try again.");
    }
}
