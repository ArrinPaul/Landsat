
"use server";
import 'server-only';

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
import { logger } from '@/lib/logger';
import { redactSensitive, sanitizePromptPayload } from '@/lib/security';


import type { AdvancedCropAdvice, DroughtFloodRisk, GenerateTimelapseVideoInput, GenerateTimelapseVideoOutput, ScenarioAnalysis } from "@/lib/types";
import type { ChatbotInput, ChatbotOutput } from "@/ai/flows/chatbot";
import type { GenerateDataInsightsInput } from "@/ai/flows/generate-insights";


const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
        if (error.cause) {
            return getErrorMessage(error.cause);
    }
                return redactSensitive(error.message || 'An unknown error occurred.');
  }
    return redactSensitive(String(error));
};

import { isRateLimited } from '@/ai/rate-limiter';

// Generic action creator
async function handleAction<T, U>(action: (input: T) => Promise<U>, input: T): Promise<{ data: U | null; error: string | null; }> {
    const safeInput = sanitizePromptPayload(input);
    const userId = "default-user"; // Replace with actual user ID when auth is implemented
    if (isRateLimited(userId)) {
        const errorMessage = "Too Many Requests: You have exceeded the rate limit. Please try again in a moment.";
        logger.warn('rate_limited', { scope: 'lib.actions', message: errorMessage });
        return { data: null, error: errorMessage };
    }

    // Explicitly check for any available credentials to enable AI features.
    const hasAnyAIKey = !!(
        process.env.GEMINI_API_KEY || 
        process.env.GOOGLE_GENAI_API_KEY || 
        process.env.GROQ_API_KEY || 
        process.env.MISTRAL_API_KEY || 
        process.env.HUGGINGFACE_API_KEY
    );

    if (!hasAnyAIKey && !process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        const errorMessage = "All AI and Satellite services are disabled. No valid API keys (Gemini, Groq, Mistral, HF) or Earth Engine credentials found in environment. Please check your configuration.";
        logger.error('missing_credentials', { scope: 'lib.actions', message: errorMessage });
        return { data: null, error: errorMessage };
    }

    const maxRetries = 3;
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            const result = await action(safeInput);
            return { data: result, error: null };
        } catch (error) {
            logger.error('action_failed_attempt', {
                scope: 'lib.actions',
                action: action.name,
                attempt: attempt + 1,
                error: getErrorMessage(error),
            });
            const errorMessage = getErrorMessage(error);

            if (errorMessage.includes('403')) {
                return { data: null, error: `Authentication Error (403): The request was forbidden. This may be due to missing IAM permissions. Please ensure your API key or service account has the 'Vertex AI User' or 'Generative Language AI User' role.` };
            }
            if (errorMessage.includes('400')) {
                return { data: null, error: `Bad Request (400): The AI model rejected the request, likely due to an invalid input format. Details: ${errorMessage}` };
            }
            if (errorMessage.includes('5 NOT_FOUND') || errorMessage.includes('NOT_FOUND')) {
                return { data: null, error: `Firestore Database Not Found: Please enable Firestore API at https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=landsat-470215 and ensure GOOGLE_APPLICATION_CREDENTIALS_JSON is set in Vercel environment variables. Wait 2-3 minutes after enabling, then redeploy.` };
            }
            if (errorMessage.includes('PERMISSION_DENIED')) {
                return { data: null, error: `Firestore Permission Denied: Enable Firestore API at https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=landsat-470215 and verify service account has Firestore permissions.` };
            }
            
            attempt++;
            if (attempt >= maxRetries) {
                return { data: null, error: `Failed to fetch from AI model after ${maxRetries} attempts. Reason: ${errorMessage}` };
            }

            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, attempt - 1) * 1000;
            logger.info('action_retry_backoff', { scope: 'lib.actions', delaySeconds: delay / 1000, action: action.name });
            await new Promise(res => setTimeout(res, delay));
        }
    }
    return { data: null, error: 'An unexpected error occurred after multiple retries.' };
}


export async function startMetricsComputationAction(input: ComputeMetricsInput): Promise<{data: StartComputationOutput | null, error: string | null}> {
    return handleAction(startMetricsComputation, input);
}

export async function getMetricsResultAction(jobId: string, _latitude: number, _longitude: number, _locationDescription: string, _dateRangeFrom: string, _dateRangeTo: string): Promise<{data: JobResultOutput | null, error: string | null}> {
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
    return handleAction(predictCropYield, {
        ...input,
        cropType: input.cropType ?? 'Maize',
    });
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


