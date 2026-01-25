
'use server';

/**
 * @fileOverview A flow for getting the current weather report for a given location.
 *
 * - getWeatherReport - A function that handles the weather report process.
 * - GetWeatherReportInput - The input type for the getWeatherReport function.
 * - GetWeatherReportOutput - The return type for the getWeatherReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { executePromptWithFallback, safeParseAIJson } from '@/ai/ai-utils';

const GetWeatherReportInputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
});
export type GetWeatherReportInput = z.infer<typeof GetWeatherReportInputSchema>;

const HourlyForecastSchema = z.object({
    time: z.string().describe("The time for the forecast (e.g., '10:00 AM', '3 PM')."),
    temperature: z.number().describe('The temperature in Celsius.'),
    conditions: z.string().describe('A brief description of the weather conditions (e.g., "Sunny").'),
    iconName: z.string().describe('The name of a relevant lucide-react icon (e.g., Sun, Cloudy, Wind, Umbrella).'),
});

const GetWeatherReportOutputSchema = z.object({
    current: z.object({
      temperature: z.number().describe('The current temperature in Celsius.'),
      conditions: z.string().describe('A brief description of the current weather conditions (e.g., Sunny, Partly Cloudy).'),
      humidity: z.number().describe('The current humidity percentage (0-100).'),
      windSpeed: z.number().describe('The current wind speed in km/h.'),
      iconName: z.string().describe('The name of a relevant lucide-react icon (e.g., Sun, Cloudy, Wind, Umbrella).'),
    }),
    forecast: z.array(HourlyForecastSchema).describe('An array of hourly forecast data for the next 24 hours.'),
    summary: z.string().describe("A brief, one-sentence summary of the day's weather outlook (e.g., 'Expect clear skies and warm temperatures throughout the day.')."),
});
export type GetWeatherReportOutput = z.infer<typeof GetWeatherReportOutputSchema>;

const getWeatherReportPrompt = ai.definePrompt({
  name: 'getWeatherReportPrompt',
  input: {schema: GetWeatherReportInputSchema},
  prompt: `You are a weather reporting service. Given the coordinates, provide a detailed and realistic weather report for the entire day. The report must be plausible for the given location and the current time of year.

  The current date is ${new Date().toISOString()}.

  Your response MUST be a valid JSON object ONLY that conforms to the GetWeatherReportOutput schema. Do not add any other text or formatting. Ensure 'iconName' is a valid string from the lucide-react library (e.g., Sun, Cloudy, Wind, Umbrella, CloudRain, Snowflake, Moon).

  **Location:**
  - Latitude: {{{latitude}}}
  - Longitude: {{{longitude}}}
`,
});

import { getCache, setCache, CacheResult } from '@/ai/cache';

// Simple logging function
const verbose = (msg: string) => process.env.NODE_ENV === 'development' && console.log(msg);

// ... (imports and schema definitions remain the same)

export async function getWeatherReport(input: GetWeatherReportInput): Promise<GetWeatherReportOutput> {
    const cacheKey = `weather-report-${input.latitude}-${input.longitude}`;
    const cacheResult = getCache<GetWeatherReportOutput>(cacheKey);

    if (cacheResult.state === 'hit') {
      return cacheResult.data;
    }

    if (cacheResult.state === 'stale') {
      verbose(`[STALE DATA] Using stale weather report for ${input.latitude}, ${input.longitude}`);
      // Non-blocking call to refresh the cache in the background
      executePromptWithFallback(getWeatherReportPrompt, input, undefined, 'weather')
        .then(response => {
            const textResponse = response.text;
            if (textResponse) {
                const parsedJson = safeParseAIJson(textResponse, (data) => GetWeatherReportOutputSchema.parse(data));
                setCache(cacheKey, parsedJson);
            }
        })
        .catch(err => console.error("Failed to refresh stale cache:", err));
      return cacheResult.data;
    }

    const response = await executePromptWithFallback(getWeatherReportPrompt, input, undefined, 'weather');
    const textResponse = response.text;

    if (!textResponse) {
      throw new Error('AI failed to generate a weather report.');
    }

    try {
      const parsedJson = safeParseAIJson(textResponse, (data) => GetWeatherReportOutputSchema.parse(data));
      setCache(cacheKey, parsedJson);
      return parsedJson;
    } catch (e) {
      console.error("Failed to parse JSON response from AI:", textResponse);
      throw new Error("AI returned invalid JSON format. Please try again.");
    }
}
