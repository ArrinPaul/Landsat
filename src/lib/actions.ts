
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

import type { SatellitePassData, WeatherData, CropPlan, IrrigationSchedule, AnalysisResult, SoilMoisturePrediction, CropYieldPrediction, SuggestCropInput, SuggestCropOutput } from "@/lib/types";
import type { ChatbotInput, ChatbotOutput } from "@/ai/flows/chatbot";
import type { TextToSpeechOutput } from "@/ai/flows/text-to-speech";
import type { GenerateDataInsightsInput } from "@/ai/flows/generate-insights";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export async function computeMetricsAction(input: { latitude: number; longitude: number; startDate: string; endDate: string; }): Promise<{data: AnalysisResult | null, error: string | null}> {
    try {
        const result: ComputeMetricsOutput = await computeMetrics(input);
        return { data: result, error: null };
    } catch (error) {
        console.error("computeMetricsAction Error:", error);
        return { data: null, error: getErrorMessage(error) };
    }
}


export async function suggestCoordinatesAction(locationDescription: string) {
  try {
    const result = await suggestCoordinates({ locationDescription });
    return { data: result };
  } catch (error) {
    console.error("suggestCoordinatesAction Error:", error);
    return { error: `AI Error: ${getErrorMessage(error)}` };
  }
}

export async function generateInsightAction(
  input: GenerateDataInsightsInput
) {
  try {
    const result = await generateDataInsights(input);
    return { data: result };
  } catch (error) {
    console.error("generateInsightAction Error:", error);
    return { error: `AI Error: ${getErrorMessage(error)}` };
  }
}

export async function generateReportAction(
  metricsData: string,
  location: string,
  dateRange: string
) {
  try {
    const result = await generateReportSummary({
      metricsData,
      location,
      dateRange,
    });
    return { data: result };
  } catch (error) {
    console.error("generateReportAction Error:", error);
    return { error: `AI Error: ${getErrorMessage(error)}` };
  }
}

export async function predictSatellitePassAction(input: { latitude: number; longitude: number; }): Promise<{data: SatellitePassData | null, error: string | null}> {
    try {
        const result = await predictSatellitePass(input);
        return { data: result, error: null };
    } catch (error) {
        console.error("predictSatellitePassAction Error:", error);
        return { data: null, error: `AI Error: ${getErrorMessage(error)}` };
    }
}

export async function getWeatherReportAction(input: { latitude: number; longitude: number; }): Promise<{data: WeatherData | null, error: string | null}> {
    try {
        const result = await getWeatherReport(input);
        return { data: result, error: null };
    } catch (error) {
        console.error("getWeatherReportAction Error:", error);
        return { data: null, error: `AI Error: ${getErrorMessage(error)}` };
    }
}

export async function chatbotAction(input: ChatbotInput): Promise<{ data: ChatbotOutput | null; error: string | null; }> {
    try {
        const result = await chatbot(input);
        return { data: result, error: null };
    } catch (error) {
        console.error("Chatbot action error:", error);
        return { data: null, error: `AI Error: ${getErrorMessage(error)}` };
    }
}

export async function planCropsAction(input: { latitude: number; longitude: number; }): Promise<{ data: CropPlan | null; error: string | null; }> {
    try {
        const result = await planCrops(input);
        return { data: result, error: null };
    } catch (error) {
        console.error("Crop planning action error:", error);
        return { data: null, error: `AI Error: ${getErrorMessage(error)}` };
    }
}

export async function scheduleIrrigationAction(input: { latitude: number; longitude: number; }): Promise<{ data: IrrigationSchedule | null; error: string | null; }> {
    try {
        const result = await scheduleIrrigation(input);
        return { data: result, error: null };
    } catch (error) {
        console.error("Irrigation scheduling action error:", error);
        return { data: null, error: `AI Error: ${getErrorMessage(error)}` };
    }
}

export async function textToSpeechAction(text: string): Promise<{ data: TextToSpeechOutput | null; error: string | null; }> {
    try {
        const result = await textToSpeech({ text });
        return { data: result, error: null };
    } catch (error) {
        console.error("Text to speech action error:", error);
        return { data: null, error: `AI Error: ${getErrorMessage(error)}` };
    }
}

export async function predictSoilMoistureAction(input: { latitude: number; longitude: number; }): Promise<{ data: SoilMoisturePrediction | null; error: string | null; }> {
    try {
        const result = await predictSoilMoisture(input);
        return { data: result, error: null };
    } catch (error) {
        console.error("Soil moisture prediction error:", error);
        return { data: null, error: `AI Error: ${getErrorMessage(error)}` };
    }
}

export async function predictCropYieldAction(input: { latitude: number; longitude: number; cropType?: string; }): Promise<{ data: CropYieldPrediction | null; error: string | null; }> {
    try {
        const result = await predictCropYield(input);
        return { data: result, error: null };
    } catch (error) {
        console.error("Crop yield prediction error:", error);
        return { data: null, error: `AI Error: ${getErrorMessage(error)}` };
    }
}

export async function suggestCropAction(input: SuggestCropInput): Promise<{ data: SuggestCropOutput | null; error: string | null; }> {
    try {
        const result = await suggestCrop(input);
        return { data: result, error: null };
    } catch (error) {
        console.error("Crop suggestion action error:", error);
        return { data: null, error: `AI Error: ${getErrorMessage(error)}` };
    }
}
