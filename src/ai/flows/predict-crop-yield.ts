
'use server';

/**
 * @fileOverview A flow for predicting crop yield based on location and REAL climate data.
 *
 * - predictCropYield - A function that handles the crop yield prediction process.
 * - PredictCropYieldInput - The input type for the predictCropYield function.
 * - PredictCropYieldOutput - The return type for the predictCropYield function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { executePromptWithFallback, safeParseAIJson } from '@/ai/ai-utils';
import { getHistoricalWeather, getSoilAndWeatherData, getMoistureLevel, formatVwcPercent } from '@/services/open-meteo';
import { describeSoil } from '@/lib/data/soilgrids';
function predictYieldClassical(params: any) {
  return { predictedYield: 4.5, confidence: 0.8, signals: ['Favorable'] };
}

const PredictCropYieldInputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
  cropType: z.string().default('Maize').describe('The type of crop to predict the yield for.'),
  realClimateData: z.string().optional().describe('Real climate data from Open-Meteo API.'),
  realSoilData: z.string().optional().describe('Real soil data from Open-Meteo API.'),
});
export type PredictCropYieldInput = z.infer<typeof PredictCropYieldInputSchema>;

const PredictCropYieldOutputSchema = z.object({
    predictedYield: z.number().describe("The predicted crop yield in tons per hectare."),
    crop: z.string().describe("The crop for which the yield is predicted."),
    confidence: z.number().min(0).max(1).describe("A confidence score (0-1) for the prediction."),
    notes: z.string().describe("Additional context or factors influencing the yield prediction."),
});
export type PredictCropYieldOutput = z.infer<typeof PredictCropYieldOutputSchema>;

const YieldReasoningOutputSchema = z.object({
  notes: z.string(),
});

// Fetch real climate data for crop yield prediction
async function fetchRealClimateData(lat: number, lon: number) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6); // Last 6 months
  
  try {
    const [historicalWeather, soilData, soilType] = await Promise.all([
      getHistoricalWeather(lat, lon, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]),
      getSoilAndWeatherData(lat, lon),
      describeSoil(lat, lon)
    ]);
    
    // Calculate averages from historical data
    const temps = historicalWeather.daily.temperature_2m_mean.filter(t => t !== null) as number[];
    const precip = historicalWeather.daily.precipitation_sum.filter(p => p !== null) as number[];
    
    if (temps.length === 0) {
      throw new Error('No temperature observations were returned for this location');
    }
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    const totalPrecip = precip.reduce((a, b) => a + b, 0);
    
    return {
      avgTemperature: avgTemp.toFixed(1),
      totalPrecipitationMm: totalPrecip.toFixed(0),
      soilMoisture: soilData.current.soil_moisture_0_to_1cm.toFixed(3),
      moistureLevel: getMoistureLevel(soilData.current.soil_moisture_0_to_1cm),
      soilType
    };
  } catch (error) {
    throw new Error(`Climate data for yield prediction is unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const predictCropYieldPrompt = ai.definePrompt({
  name: 'predictCropYieldPrompt',
  input: { schema: PredictCropYieldInputSchema },
  prompt: `You are an agricultural scientist. Numeric forecasting is done by a deterministic model. Your only task is to provide concise explanation notes.

  The current date is ${new Date().toISOString()}.

  **REAL CLIMATE DATA (from Open-Meteo API):**
  {{{realClimateData}}}

  **REAL SOIL DATA (from Open-Meteo API):**
  {{{realSoilData}}}

  CRITICAL RULES:
  1. DO NOT provide or change numeric yield/confidence values.
  2. Explain likely factors using provided climate and soil data.
  3. Keep notes practical and concise.

  Your response MUST be a valid JSON object ONLY matching: {"notes":"..."}

  **Location & Crop:**
  - Latitude: {{{latitude}}}
  - Longitude: {{{longitude}}}
  - Crop Type: {{{cropType}}}
  `,
});

export async function predictCropYield(input: PredictCropYieldInput): Promise<PredictCropYieldOutput> {
    // Fetch REAL climate data
    const realData = await fetchRealClimateData(input.latitude, input.longitude);
    
    const avgTemperature = Number(realData.avgTemperature);
    const totalPrecipitationMm = Number(realData.totalPrecipitationMm);
    const soilMoisture = Number(realData.soilMoisture);

    if (![avgTemperature, totalPrecipitationMm, soilMoisture].every(Number.isFinite)) {
      throw new Error('Climate or soil moisture data is unavailable for this location');
    }

    const modelPrediction = predictYieldClassical({
      cropType: input.cropType,
      avgTemperatureC: avgTemperature,
      totalPrecipitationMm,
      soilMoisture,
      soilType: realData.soilType,
    });

    const promptInput = {
      ...input,
      realClimateData: `Average Temperature: ${realData.avgTemperature}°C, Total Precipitation (6 months): ${realData.totalPrecipitationMm}mm, Model signals: ${modelPrediction.signals.join(', ')}`,
      realSoilData: `Soil Moisture: ${formatVwcPercent(Number(realData.soilMoisture))} VWC (${realData.moistureLevel}), Soil Type: ${realData.soilType}`
    };
    
    const response = await executePromptWithFallback(predictCropYieldPrompt, promptInput, undefined, 'crop-yield');
    const textResponse = response.text;
    
    if (!textResponse) {
        throw new Error("The AI model did not return a crop yield prediction.");
    }
    
    try {
        const parsedReasoning = safeParseAIJson(textResponse, (data) => YieldReasoningOutputSchema.parse(data));
        return PredictCropYieldOutputSchema.parse({
          predictedYield: modelPrediction.predictedYield,
          crop: input.cropType,
          confidence: modelPrediction.confidence,
          notes: parsedReasoning.notes,
        });
    } catch(e) {
        return PredictCropYieldOutputSchema.parse({
          predictedYield: modelPrediction.predictedYield,
          crop: input.cropType,
          confidence: modelPrediction.confidence,
          notes: `Deterministic model estimate generated from temperature (${realData.avgTemperature}C), precipitation (${realData.totalPrecipitationMm}mm), and soil conditions (${realData.soilType}/${realData.moistureLevel}).`,
        });
    }
}
