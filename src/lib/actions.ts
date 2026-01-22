
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

// Generic action creator
async function handleAction<T, U>(action: (input: T) => Promise<U>, input: T): Promise<{ data: U | null; error: string | null; }> {
    // Explicitly check for credentials and provide a clear error message.
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        const errorMessage = "AI features are disabled. No GEMINI_API_KEY or GOOGLE_APPLICATION_CREDENTIALS_JSON found in environment variables. Please add your credentials to the .env file.";
        console.error(errorMessage);
        return { data: null, error: errorMessage };
    }

    try {
        const result = await action(input);
        return { data: result, error: null };
    } catch (error) {
        console.error(`Action '${action.name}' failed:`, error);
        const errorMessage = getErrorMessage(error);
        
        if (errorMessage.includes('403')) {
             return { data: null, error: `Authentication Error (403): The request was forbidden. This may be due to missing IAM permissions. Please ensure your API key or service account has the 'Vertex AI User' or 'Generative Language AI User' role.` };
        }
        if (errorMessage.includes('400')) {
             return { data: null, error: `Bad Request (400): The AI model rejected the request, likely due to an invalid input format. Details: ${errorMessage}` };
        }
        
        return { data: null, error: `Failed to fetch from AI model. Reason: ${errorMessage}` };
    }
}


export async function startMetricsComputationAction(input: ComputeMetricsInput): Promise<{data: StartComputationOutput | null, error: string | null}> {
    return handleAction(startMetricsComputation, input);
}

export async function getMetricsResultAction(jobId: string): Promise<{data: JobResultOutput | null, error: string | null}> {
    return handleAction(getMetricsResult, jobId);
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
