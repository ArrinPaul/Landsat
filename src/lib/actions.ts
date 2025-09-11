
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
import { computeMetrics, type ComputeMetricsOutput } from "@/ai/flows/compute-metrics";
import { predictSoilMoisture } from "@/ai/flows/predict-soil-moisture";
import { predictCropYield } from "@/ai/flows/predict-crop-yield";
import { suggestCrop } from "@/ai/flows/suggest-crop";
import { analyzeDroughtAndFloodRisk } from "@/ai/flows/analyze-drought-flood-risk";
import { getAdvancedCropAdvice } from "@/ai/flows/get-advanced-crop-advice";
import { generateTimelapseVideo } from "@/ai/flows/generate-timelapse-video";
import { runScenarioAnalysis } from "@/ai/tools/run-scenario-analysis";


import type { SatellitePassData, WeatherData, CropPlan, IrrigationSchedule, AnalysisResult, SoilMoisturePrediction, CropYieldPrediction, SuggestCropInput, SuggestCropOutput, DroughtFloodRisk, AdvancedCropAdvice, GenerateTimelapseVideoInput, GenerateTimelapseVideoOutput, ScenarioAnalysis } from "@/lib/types";
import type { ChatbotInput, ChatbotOutput } from "@/ai/flows/chatbot";
import type { TextToSpeechOutput } from "@/ai/flows/text-to-speech";
import type { GenerateDataInsightsInput } from "@/ai/flows/generate-insights";


const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

// Generic action creator
async function handleAction<T, U>(action: (input: T) => Promise<U>, input: T): Promise<{ data: U | null; error: string | null; }> {
    try {
        const result = await action(input);
        return { data: result, error: null };
    } catch (error) {
        console.error(`${action.name} Error:`, error);
        return { data: null, error: getErrorMessage(error) };
    }
}


export async function computeMetricsAction(input: { latitude: number; longitude: number; startDate: string; endDate: string; }): Promise<{data: AnalysisResult | null, error: string | null}> {
    return handleAction(computeMetrics, input);
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

export async function chatbotAction(input: ChatbotInput) {
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

export async function suggestCropAction(input: SuggestCropInput) {
    return handleAction(suggestCrop, input);
}

export async function analyzeDroughtAndFloodRiskAction(input: { latitude: number; longitude: number; }): Promise<{ data: DroughtFloodRisk | null; error: string | null; }> {
    return handleAction(analyzeDroughtAndFloodRisk, input);
}

export async function getAdvancedCropAdviceAction(input: { latitude: number; longitude: number; climateDescription: string; crop: string; }): Promise<{ data: AdvancedCropAdvice | null; error: string | null; }> {
    return handleAction(getAdvancedCropAdvice, input);
}

export async function generateTimelapseVideoAction(input: GenerateTimelapseVideoInput): Promise<{ data: GenerateTimelapseVideoOutput | null; error: string | null; }> {
    return handleAction(generateTimelapseVideo, input);
}

export async function runScenarioAnalysisAction(input: { latitude: number; longitude: number; scenarioDescription: string; }): Promise<{ data: ScenarioAnalysis | null; error: string | null; }> {
    return handleAction(runScenarioAnalysis, input);
}
