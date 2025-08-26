
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

import type { MetricData, SatellitePassData, WeatherData, CropPlan, IrrigationSchedule } from "@/lib/types";
import type { ChatbotInput, ChatbotOutput } from "@/ai/flows/chatbot";
import type { TextToSpeechOutput } from "@/ai/flows/text-to-speech";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

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
  metric: Omit<MetricData, "timeSeries" | "groundTruth" | "insight">
) {
  try {
    const result = await generateDataInsights({
      metricName: metric.name,
      firstValue: metric.firstValue ?? 0,
      lastValue: metric.lastValue ?? 0,
      percentageChange: metric.percentageChange ?? 0,
      numberOfValidPoints: metric.n,
    });
    return { data: result.insight };
  } catch (error) {
    console.error("generateInsightAction Error:", error);
    return { error: `AI Error: ${getErrorMessage(error)}` };
  }
}

export async function generateReportAction(
  metricsData: MetricData[],
  location: string,
  dateRange: string
) {
  try {
    const simplifiedMetrics = metricsData.map(d => ({
        name: d.name,
        firstValue: d.firstValue,
        lastValue: d.lastValue,
        percentageChange: d.percentageChange,
        n: d.n
    }));

    const result = await generateReportSummary({
      metricsData: JSON.stringify(simplifiedMetrics, null, 2),
      location,
      dateRange,
    });
    return { data: result.summaryReport };
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
