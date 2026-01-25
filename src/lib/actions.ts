
"use server";

import { generateDataInsights } from "@/ai/flows/generate-insights";
import { generateReportSummary } from "@/ai/flows/generate-report-summary";
import { suggestCoordinates } from "@/ai/flows/suggest-coordinates";
import { predictSatellitePass } from "@/ai/flows/predict-satellite-pass";
import { getWeatherReport } from "@/ai/flows/get-weather-report";
import { chatbot } from "@/ai/flows/chatbot";
import { planCrops } from "@/ai/flows/plan-crops";
import { scheduleIrrigation } from "@/ai/flows/schedule-irrigation";
import { textToSpeech } from "@/ai/flows/text-to-speech";
import { startMetricsComputation, getMetricsResult, type ComputeMetricsInput, type JobResultOutput, type StartComputationOutput } from "@/ai/flows/compute-metrics";
import { predictSoilMoisture } from "@/ai/flows/predict-soil-moisture";
import { predictCropYield } from "@/ai/flows/predict-crop-yield";
import { suggestCrop, type SuggestCropInput, type SuggestCropOutput } from "@/ai/flows/suggest-crop";
import { analyzeDroughtAndFloodRisk } from "@/ai/flows/analyze-drought-flood-risk";
import { getAdvancedCropAdvice, type AdvancedCropAdviceInput } from "@/ai/flows/get-advanced-crop-advice";
import { generateTimelapseVideo } from "@/ai/flows/generate-timelapse-video";
import { runScenarioAnalysis } from "@/ai/tools/run-scenario-analysis";
import { getDroughtAndFloodRiskData } from "@/ai/tools/get-drought-flood-risk-data";
import { analyzeChange, type AnalyzeChangeOutput, type AnalyzeChangeInput } from "@/ai/flows/analyze-change";

import type { AnalysisResult, AdvancedCropAdvice, DroughtFloodRisk, GenerateTimelapseVideoInput, GenerateTimelapseVideoOutput, ScenarioAnalysis, CropPlan, CropYieldPrediction, IrrigationSchedule, SatellitePassData, SoilMoisturePrediction, WeatherData } from "@/lib/types";
import type { ChatbotInput, ChatbotOutput } from "@/ai/flows/chatbot";
import type { GenerateDataInsightsInput } from "@/ai/flows/generate-insights";


const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    // Check for nested errors or specific properties on the error object
    const anyError = error as any;
    if (anyError.cause) {
      return getErrorMessage(anyError.cause);
    }
    return anyError.message || 'An unknown error occurred.';
  }
  return String(error);
};

import { isRateLimited } from '@/ai/rate-limiter';

// ... (imports and other functions remain the same)

// Generic action creator
async function handleAction<T, U>(action: (input: T) => Promise<U>, input: T): Promise<{ data: U | null; error: string | null; }> {
    const userId = "default-user"; // Replace with actual user ID when auth is implemented
    if (isRateLimited(userId)) {
        const errorMessage = "Too Many Requests: You have exceeded the rate limit. Please try again in a moment.";
        console.warn(errorMessage);
        return { data: null, error: errorMessage };
    }

    // Explicitly check for credentials and provide a clear error message.
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        const errorMessage = "AI features are disabled. No GEMINI_API_KEY or GOOGLE_APPLICATION_CREDENTIALS_JSON found in environment variables. Please add your credentials to the .env file.";
        console.error(errorMessage);
        return { data: null, error: errorMessage };
    }

    const maxRetries = 3;
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            const result = await action(input);
            return { data: result, error: null };
        } catch (error) {
            console.error(`Action '${action.name}' failed on attempt ${attempt + 1}:`, error);
            const errorMessage = getErrorMessage(error);

            if (errorMessage.includes('403')) {
                return { data: null, error: `Authentication Error (403): The request was forbidden. This may be due to missing IAM permissions. Please ensure your API key or service account has the 'Vertex AI User' or 'Generative Language AI User' role.` };
            }
            if (errorMessage.includes('400')) {
                return { data: null, error: `Bad Request (400): The AI model rejected the request, likely due to an invalid input format. Details: ${errorMessage}` };
            }
            
            attempt++;
            if (attempt >= maxRetries) {
                return { data: null, error: `Failed to fetch from AI model after ${maxRetries} attempts. Reason: ${errorMessage}` };
            }

            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, attempt - 1) * 1000;
            console.log(`Retrying in ${delay / 1000}s...`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
    return { data: null, error: 'An unexpected error occurred after multiple retries.' };
}


export async function startMetricsComputationAction(input: ComputeMetricsInput): Promise<{data: StartComputationOutput | null, error: string | null}> {
    return handleAction(startMetricsComputation, input);
}

export async function getMetricsResultAction(jobId: string, latitude: number, longitude: number, locationDescription: string, dateRangeFrom: string, dateRangeTo: string): Promise<{data: JobResultOutput | null, error: string | null}> {
    const result = await handleAction(getMetricsResult, jobId);

    if (result.data && result.data.status === 'completed' && result.data.result) {
        // Now that we have the completed analysis result, perform change analysis
        const currentAnalysisResult: AnalysisResult = result.data.result;

        // Check if metrics exist before proceeding with change analysis
        if (!currentAnalysisResult.metrics) {
            console.warn('Metrics data is undefined in analysis result, skipping change analysis');
            return result;
        }

        // Simulate historical metrics
        const historicalMetricsRes = await simulateHistoricalMetricsAction({
            latitude,
            longitude,
            currentEndDate: dateRangeTo,
            timeframeMonths: 12, // Simulate 12 months of historical data
        });

        if (historicalMetricsRes.error || !historicalMetricsRes.data) {
            console.warn(`Could not simulate historical metrics for change analysis: ${historicalMetricsRes.error}`);
            // Proceed without historical data if simulation fails, or handle as an error
            // For now, we will just not add the change analysis if historical data is missing
        } else if (currentAnalysisResult.metrics && 
                   currentAnalysisResult.metrics.NDVI && 
                   currentAnalysisResult.metrics.NDWI && 
                   currentAnalysisResult.metrics.NDBI && 
                   currentAnalysisResult.metrics.NBR && 
                   currentAnalysisResult.metrics.MNDWI) {
            // Prepare input for analyzeChange flow
            const analyzeChangeInput: AnalyzeChangeInput = {
                latitude,
                longitude,
                locationDescription,
                currentMetrics: {
                    NDVI: currentAnalysisResult.metrics.NDVI.map(m => m.value),
                    NDWI: currentAnalysisResult.metrics.NDWI.map(m => m.value),
                    NDBI: currentAnalysisResult.metrics.NDBI.map(m => m.value),
                    NBR: currentAnalysisResult.metrics.NBR.map(m => m.value),
                    MNDWI: currentAnalysisResult.metrics.MNDWI.map(m => m.value),
                },
                historicalMetrics: historicalMetricsRes.data,
                dateRange: {
                    from: dateRangeFrom,
                    to: dateRangeTo,
                },
                language: 'en', // Assuming English for now, can be made dynamic
            };

            // Call the analyzeChange flow
            const changeAnalysisRes = await handleAction(analyzeChange, analyzeChangeInput);

            if (changeAnalysisRes.error || !changeAnalysisRes.data) {
                console.error(`Change analysis failed: ${changeAnalysisRes.error}`);
                // Continue without change analysis if it fails
            } else {
                // Add the change analysis result to the AnalysisResult object
                currentAnalysisResult.changeAnalysis = changeAnalysisRes.data;
            }
        }
    }
    return result;
}


export async function suggestCoordinatesAction(locationDescription: string) {
    return handleAction(suggestCoordinates, { locationDescription });
}

export async function generateInsightAction(input: GenerateDataInsightsInput) {
    return handleAction(generateDataInsights, input);
}

export async function generateReportAction(metricsData: string, location: string, dateRange: string) {
    return handleAction(generateReportSummary, { metricsData, location, dateRange });
}

export async function predictSatellitePassAction(input: { latitude: number; longitude: number; }) {
    return handleAction(predictSatellitePass, input);
}

export async function getWeatherReportAction(input: { latitude: number; longitude: number; }) {
    return handleAction(getWeatherReport, input);
}

export async function chatbotAction(input: ChatbotInput): Promise<{ data: ChatbotOutput | null, error: string | null}> {
    return handleAction(chatbot, input);
}

export async function planCropsAction(input: { latitude: number; longitude: number; }) {
    return handleAction(planCrops, input);
}

export async function scheduleIrrigationAction(input: { latitude: number; longitude: number; }) {
    return handleAction(scheduleIrrigation, input);
}

export async function textToSpeechAction(text: string) {
    return handleAction(textToSpeech, { text });
}

export async function predictSoilMoistureAction(input: { latitude: number; longitude: number; }) {
    return handleAction(predictSoilMoisture, input);
}

export async function predictCropYieldAction(input: { latitude: number; longitude: number; cropType?: string; }) {
    return handleAction(predictCropYield, input);
}

export async function suggestCropAction(input: SuggestCropInput): Promise<{ data: SuggestCropOutput | null; error: string | null; }> {
    return handleAction(suggestCrop, input);
}

export async function getAdvancedCropAdviceAction(input: AdvancedCropAdviceInput): Promise<{ data: AdvancedCropAdvice | null; error: string | null; }> {
    return handleAction(getAdvancedCropAdvice, input);
}

export async function generateTimelapseVideoAction(input: GenerateTimelapseVideoInput): Promise<{ data: GenerateTimelapseVideoOutput | null; error: string | null; }> {
    return handleAction(generateTimelapseVideo, input);
}

export async function runScenarioAnalysisAction(input: { latitude: number; longitude: number; scenarioDescription: string; }): Promise<{ data: ScenarioAnalysis | null; error: string | null; }> {
    return handleAction(runScenarioAnalysis, input);
}

export async function analyzeDroughtAndFloodRiskAction(input: { latitude: number; longitude: number; }): Promise<{ data: DroughtFloodRisk | null; error: string | null; }> {
    return handleAction(analyzeDroughtAndFloodRisk, input);
}

// Simulate historical data for a given location and metric type
export async function simulateHistoricalMetricsAction(input: {
    latitude: number;
    longitude: number;
    currentEndDate: string; // ISO string for the end date of current analysis
    timeframeMonths: number; // How many months back to simulate historical data
}): Promise<{ data: AnalyzeChangeInput['historicalMetrics'] | null; error: string | null; }> {
    try {
        const { latitude, longitude, currentEndDate, timeframeMonths } = input;
        const endDate = new Date(currentEndDate);
        const startDate = new Date(endDate);
        startDate.setMonth(endDate.getMonth() - timeframeMonths);

        const generateDummyData = (seed: number, count: number): number[] => {
            const data = [];
            let value = seed;
            for (let i = 0; i < count; i++) {
                value = Math.max(0, Math.min(1, value + (Math.random() - 0.5) * 0.1)); // Simulate small fluctuations between 0 and 1
                data.push(parseFloat(value.toFixed(2)));
            }
            return data;
        };

        // For simplicity, generate 10 data points for each metric for the historical period
        const dataPoints = 10;
        const historicalMetrics = {
            NDVI: generateDummyData(0.5 + latitude / 100, dataPoints),
            NDWI: generateDummyData(0.3 + longitude / 100, dataPoints),
            NDBI: generateDummyData(0.2 + (latitude + longitude) / 200, dataPoints),
            NBR: generateDummyData(0.4 - latitude / 100, dataPoints),
            MNDWI: generateDummyData(0.35 + longitude / 100, dataPoints),
        };

        return { data: historicalMetrics, error: null };
    } catch (error) {
        console.error(`simulateHistoricalMetricsAction failed:`, error);
        return { data: null, error: `Failed to simulate historical metrics: ${getErrorMessage(error)}` };
    }
}
