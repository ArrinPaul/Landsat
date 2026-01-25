'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { executePromptWithFallback, safeParseAIJson } from '@/ai/ai-utils';
import { AnalysisResult } from '@/lib/types'; // Assuming AnalysisResult exists and contains metrics

// Placeholder schema for historical data. This will need refinement.
const HistoricalDataSchema = z.object({
  metricName: z.string(),
  values: z.array(z.number()),
  dates: z.array(z.string()),
});

const AnalyzeChangeInputSchema = z.object({
  latitude: z.number().describe('The latitude of the analysis location.'),
  longitude: z.number().describe('The longitude of the analysis location.'),
  locationDescription: z.string().describe('A brief description of the analysis location.'),
  currentMetrics: z.object({ // Simplified for now, will map to AnalysisResult metrics
    NDVI: z.array(z.number()).describe('Normalized Difference Vegetation Index values over time.'),
    NDWI: z.array(z.number()).describe('Normalized Difference Water Index values over time.'),
    NDBI: z.array(z.number()).describe('Normalized Difference Built-up Index values over time.'),
    NBR: z.array(z.number()).describe('Normalized Burn Ratio values over time.'),
    MNDWI: z.array(z.number()).describe('Modified Normalized Difference Water Index values over time.'),
  }).describe('The currently computed environmental metrics for the selected date range.'),
  historicalMetrics: z.object({ // Placeholder, will contain historical values for comparison
    NDVI: z.array(z.number()).describe('Historical NDVI values for comparison.'),
    NDWI: z.array(z.number()).describe('Historical NDWI values for comparison.'),
    NDBI: z.array(z.number()).describe('Historical NDBI values for comparison.'),
    NBR: z.array(z.number()).describe('Historical NBR values for comparison.'),
    MNDWI: z.array(z.number()).describe('Historical MNDWI values for comparison.'),
  }).describe('Historical environmental metrics for the same location, used for contextualization.'),
  dateRange: z.object({
    from: z.string().describe('Start date of the current metrics in ISO format.'),
    to: z.string().describe('End date of the current metrics in ISO format.'),
  }).describe('The date range for which current metrics were computed.'),
  language: z.string().optional().default('en').describe('The language for the output reasoning.'),
});
export type AnalyzeChangeInput = z.infer<typeof AnalyzeChangeInputSchema>;

const AnalyzeChangeOutputSchema = z.object({
  changeClassification: z.enum(['Normal', 'Transitional', 'Concerning', 'Critical']).describe('The classification of the detected environmental change.'),
  confidenceScore: z.number().min(0).max(1).describe('A confidence score (0-1) for the classification.'),
  explanation: z.string().describe('A human-readable explanation of the detected change, its context, and potential implications, explicitly referencing the provided metric data.'),
  recommendedAction: z.string().describe('A concise recommendation for action based on the change classification.'),
});
export type AnalyzeChangeOutput = z.infer<typeof AnalyzeChangeOutputSchema>;

const analyzeChangePrompt = ai.definePrompt({
  name: 'analyzeChangePrompt',
  input: { schema: AnalyzeChangeInputSchema },
  // No tools are used for this flow directly, as it analyzes provided data.
  prompt: `You are an expert environmental change analyst AI. Your task is to analyze environmental metric data for a specific location, compare current observations against historical norms, classify the detected changes, provide a clear explanation, and recommend an action.

  Your response must be in the specified language: {{{language}}}.

  Location: Latitude {{{latitude}}}, Longitude {{{longitude}}} ({{{locationDescription}}})
  Current Metrics (Date Range: {{{dateRange.from}}} to {{{dateRange.to}}}):
  NDVI: {{{JSON.stringify currentMetrics.NDVI}}}
  NDWI: {{{JSON.stringify currentMetrics.NDWI}}}
  NDBI: {{{JSON.stringify currentMetrics.NDBI}}}
  NBR: {{{JSON.stringify currentMetrics.NBR}}}
  MNDWI: {{{JSON.stringify currentMetrics.MNDWI}}}

  Historical Metrics (for context and comparison):
  NDVI: {{{JSON.stringify historicalMetrics.NDVI}}}
  NDWI: {{{JSON.stringify historicalMetrics.NDWI}}}
  NDBI: {{{JSON.stringify historicalMetrics.NDBI}}}
  NBR: {{{JSON.stringify historicalMetrics.NBR}}}
  MNDWI: {{{JSON.stringify historicalMetrics.MNDWI}}}

  Follow these steps from the "Earth Insights — Change Interpretation & Action Guide (AI-Oriented)" roadmap to analyze the change:
  1.  **Measure**: Compute absolute and percentage change between current and historical metrics for the given date range.
  2.  **Contextualize**: Compare the current changes against the provided historical norms and consider the general location context.
  3.  **Correlate**: Cross-check related metrics to identify compound patterns (e.g., NDVI decrease coinciding with NDBI increase).
  4.  **Classify**: Based on the analysis, classify the change into one of the following categories: 'Normal', 'Transitional', 'Concerning', or 'Critical'. Refer to the "Types of Change" and "Metric-Specific Change Interpretation Rules" in the roadmap.
  5.  **Explain**: Provide a human-readable explanation of the detected change, its context, and potential implications. Explicitly reference the provided metric data (current and historical) in your explanation. Adhere to the "Output Language Guidelines" in the roadmap – calm, neutral, trustworthy, clear.
  6.  **Act**: Recommend a concise action based on the "Action Mapping Summary" in the roadmap.

  Your final output MUST be a valid JSON object ONLY that conforms to the AnalyzeChangeOutput schema.
  - 'changeClassification': The determined classification.
  - 'confidenceScore': A score between 0 and 1 indicating your confidence in the classification.
  - 'explanation': The detailed explanation.
  - 'recommendedAction': The recommended action.
  `,
});

export async function analyzeChange(input: AnalyzeChangeInput): Promise<AnalyzeChangeOutput> {
  const response = await executePromptWithFallback(analyzeChangePrompt, input, undefined, 'analyze-change');
  const textResponse = response.text;

  if (!textResponse) {
    throw new Error("The AI model did not return an output. Please try again.");
  }

  try {
    const parsedJson = safeParseAIJson(textResponse, (data) => AnalyzeChangeOutputSchema.parse(data));
    return parsedJson;
  } catch (e) {
    console.error("Failed to parse JSON response from AI:", textResponse);
    throw new Error("AI returned invalid JSON format. Please try again.");
  }
}
