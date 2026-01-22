
'use server';

/**
 * @fileOverview An AI tool for running "what-if" scenario analysis based on user queries.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ScenarioAnalysisInputSchema = z.object({
  latitude: z.number().describe('The latitude of the location for the scenario.'),
  longitude: z.number().describe('The longitude of the location for the scenario.'),
  scenarioDescription: z.string().describe("The user's hypothetical scenario, e.g., 'a 2-degree temperature increase' or '15% more rainfall'."),
});

const ScenarioAnalysisOutputSchema = z.object({
  scenario: z.string().describe("A confirmation of the scenario being analyzed."),
  likelyImpact: z.string().describe("A detailed but clear summary of the likely ecological and agricultural impacts of the scenario."),
  confidence: z.number().min(0).max(1).describe("The model's confidence in its analysis, from 0 to 1."),
});


export const runScenarioAnalysis = ai.defineTool(
  {
    name: 'runScenarioAnalysis',
    description: 'Analyzes the likely impact of a hypothetical environmental scenario for a given location, such as changes in temperature or rainfall. Use this tool when the user asks a "what if" question about environmental changes.',
    inputSchema: ScenarioAnalysisInputSchema,
  },
  async (input) => {
    // In a real-world application, this could trigger complex models.
    // For now, we'll use a powerful LLM to generate a data-grounded, speculative answer.
    const scenarioPrompt = ai.definePrompt({
        name: 'runScenarioAnalysisPrompt',
        prompt: `You are an expert environmental scientist and agronomist.
          Analyze the following hypothetical scenario for the location at latitude ${input.latitude} and longitude ${input.longitude}.
          
          Scenario: "${input.scenarioDescription}"
          
          Based on your knowledge of local climate, typical ecosystems, and agricultural practices for this region, provide a detailed but clear analysis of the likely impacts.
          - What would be the primary effects on local vegetation (NDVI) and water resources (NDWI)?
          - How might this affect common agricultural crops grown in this area?
          - What are the secondary or cascading effects (e.g., on soil erosion, biodiversity, local economy)?
          
          Your response MUST be a valid JSON object ONLY that conforms to the ScenarioAnalysisOutput schema.
          - The 'scenario' field in your output should be a confirmation of the scenario being analyzed.
          - Provide a comprehensive summary of the likely impact and a confidence score for your analysis. Your response must be grounded in plausible scientific reasoning, even though it is a simulation.
          `,
    });

    const response = await scenarioPrompt(input);
    const textResponse = response.text;

    if (!textResponse) {
      throw new Error("Failed to generate a scenario analysis output.");
    }
    
    try {
        const parsedJson = JSON.parse(textResponse);
        return ScenarioAnalysisOutputSchema.parse(parsedJson);
    } catch(e) {
        console.error("Failed to parse JSON response from AI:", textResponse);
        throw new Error("AI returned invalid JSON format.");
    }
  }
);
