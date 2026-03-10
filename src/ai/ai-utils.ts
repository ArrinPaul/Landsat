/**
 * @fileOverview Utility functions for AI operations with fallback mechanisms.
 * Provides retry logic and model fallback for handling API rate limits and errors.
 * Supports multi-provider setup: Groq → HuggingFace → Mistral → Google Gemini
 */
import 'server-only';

import { ai, MODELS } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { generateWithFallback as generateWithMultiProvider } from '@/ai/providers';
import { sanitizePromptPayload } from '@/lib/security';

export interface RetryConfig {
  maxRetries?: number;
  retryDelayMs?: number;
  exponentialBackoff?: boolean;
}

export interface FallbackConfig {
  models?: string[];
  retryConfig?: RetryConfig;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  exponentialBackoff: true,
};

const DEFAULT_MODELS = [
  MODELS.fast,      // gemini-2.0-flash (fastest, cheapest)
  MODELS.primary,   // gemini-2.0-flash
  MODELS.fallback,  // gemini-2.0-flash-exp
  MODELS.pro,       // gemini-2.0-flash-exp (most capable)
];

/**
 * Determines if an error is retryable (rate limit, quota, temporary issues)
 */
function isRetryableError(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code || '';
  
  return (
    errorMessage.includes('429') ||
    errorMessage.includes('quota') ||
    errorMessage.includes('resource_exhausted') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests') ||
    errorMessage.includes('temporarily unavailable') ||
    errorCode === 'RESOURCE_EXHAUSTED' ||
    errorCode === 'UNAVAILABLE'
  );
}

/**
 * Determines if we should try a different model (model not found/not supported)
 */
function shouldTryNextModel(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || '';
  
  return (
    errorMessage.includes('404') ||
    errorMessage.includes('not found') ||
    errorMessage.includes('not supported') ||
    errorMessage.includes('invalid model') ||
    errorMessage.includes('model does not exist')
  );
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with optional exponential backoff
 */
function calculateDelay(baseDelay: number, attempt: number, useExponentialBackoff: boolean): number {
  if (useExponentialBackoff) {
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 500;
    return Math.min(baseDelay * Math.pow(2, attempt) + jitter, 60000); // Max 60 seconds
  }
  return baseDelay;
}

/**
 * Sanitize user input to prevent prompt injection.
 * Removes common injection patterns and escapes sensitive characters.
 */
function sanitizeInput(input: any): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  // Basic sanitization: remove potential instruction-ending patterns and common injection keywords
  return str
    .replace(/<\|.*?\|>/g, '') // Remove special tokens
    .replace(/\[INST\]/gi, '') // Remove Mistral instruction tags
    .replace(/\[\/INST\]/gi, '')
    .replace(/<system>|<user>|<assistant>/gi, '') // Remove common role tags
    .replace(/ignore previous instructions/gi, '[INJECTION ATTEMPT]')
    .replace(/you are now/gi, '[INJECTION ATTEMPT]')
    .trim();
}

/**
 * Execute a prompt with automatic model fallback and retry logic.
 * Use this for any AI prompt execution that needs resilience.
 * 
 * RATE LIMIT PROTECTION STRATEGY (prevents billing overages):
 * 1. Google Gemini (PRIMARY - but with AGGRESSIVE rate limit detection)
 *    - Tries Gemini ONLY ONCE
 *    - IMMEDIATELY falls back to free providers if rate limited
 *    - This prevents hitting daily limits that could incur charges!
 * 2. Groq (FREE - 14,400 req/day, 100% free forever, no billing EVER)
 * 3. HuggingFace (FREE - ~30k req/month, 100% free forever, no billing EVER)
 * 
 * NOTE: Mistral removed from chain due to billing concerns
 * 
 * @param promptFn - The prompt function to execute (from ai.definePrompt)
 * @param input - The input to pass to the prompt
 * @param config - Optional configuration for fallback and retry behavior
 * @param flowHint - Optional hint about the expected output schema
 * @returns The prompt response
 */
export async function executePromptWithFallback<TInput, TOutput>(
  promptFn: (input: TInput) => Promise<{ text: string }>,
  input: TInput,
  config?: FallbackConfig,
  flowHint?: string
): Promise<{ text: string }> {
  const sanitizedInput = sanitizePromptPayload(input);
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config?.retryConfig };
  
  // FIRST: Try Google Gemini (but with AGGRESSIVE rate limit protection)
  let lastError: Error | null = null;
  console.log('[AI] Attempting Gemini (gemini-2.0-flash - with rate limit protection)...');
  
  // ONLY 1 ATTEMPT for Gemini to prevent hitting daily limits!
  const MAX_GEMINI_ATTEMPTS = 1; // Prevents overuse and billing charges
  
  for (let attempt = 0; attempt < MAX_GEMINI_ATTEMPTS; attempt++) {
    try {
    const response = await promptFn(sanitizedInput);
      console.log(`[AI] ✓ Success with Gemini`);
      return response;
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message?.toLowerCase() || '';
      
      // AGGRESSIVE rate limit detection - immediately switch to free providers
      if (isRetryableError(error)) {
        console.warn(`[AI] ⚠️ Gemini rate limit detected! Switching to FREE providers to prevent billing...`);
        // Don't retry Gemini - go straight to free providers to avoid hitting daily limit
        break;
      }
      
      // Any error - also switch to free providers to be safe
      console.warn(`[AI] Gemini error: ${errorMessage.substring(0, 100)}. Switching to FREE providers...`);
      break;
    }
  }

  // SECOND: Try free providers as backup (Groq → Mistral → HuggingFace)
  try {
    console.log('[AI] Attempting FREE providers (Groq → Mistral → HuggingFace)...');
    
    // Construct a proper prompt for the free providers based on flowHint or input structure
    let promptText: string;
    
    if (typeof sanitizedInput === 'string') {
      promptText = sanitizedInput;
    } else {
      const inputData = sanitizedInput as Record<string, any>;
      const currentDate = new Date().toISOString();
      
      // Detect flow type from flowHint or input structure
      let detectedFlow = flowHint;
      
      if (!detectedFlow) {
        // Auto-detect based on input fields
        if ('locationDescription' in inputData && !('latitude' in inputData)) detectedFlow = 'coordinates';
        else if ('metricName' in inputData && 'firstValue' in inputData) detectedFlow = 'insights';
        else if ('crop' in inputData && 'climateDescription' in inputData) detectedFlow = 'crop-advice';
        else if ('climateDescription' in inputData && 'latitude' in inputData) detectedFlow = 'suggest-crop';
        else if ('cropType' in inputData && 'latitude' in inputData) detectedFlow = 'crop-yield';
        else if ('scenarioDescription' in inputData) detectedFlow = 'scenario';
        else if ('latitude' in inputData && 'longitude' in inputData) detectedFlow = 'satellite';
        else detectedFlow = 'generic';
      }
      
      const lat = inputData.latitude;
      const lon = inputData.longitude;
      
      switch (detectedFlow) {
        case 'coordinates':
          promptText = `You are a geography expert. Given a location description, suggest relevant latitude and longitude coordinates.

Location Description: ${sanitizeInput(inputData.locationDescription)}

IMPORTANT: You MUST respond with ONLY a valid JSON object. No other text, no explanations, no markdown.
Your response must be exactly in this format:
{"latitude": <number>, "longitude": <number>, "confidence": <number between 0 and 1>}

Example: {"latitude": 48.8566, "longitude": 2.3522, "confidence": 0.95}

Now provide the JSON:`;
          break;
          
        case 'insights':
          promptText = `You are an environmental data analyst. Given metric data, provide a concise one-sentence insight.

Metric: ${sanitizeInput(inputData.metricName)}
First Value: ${inputData.firstValue}
Last Value: ${inputData.lastValue}
Percentage Change: ${inputData.percentageChange}%
Data Points: ${inputData.numberOfValidPoints}

IMPORTANT: You MUST respond with ONLY a valid JSON object. No other text, no explanations, no markdown.
Your response must be exactly in this format:
{"insight": "<one clear sentence about the trend or what it means>"}

Example: {"insight": "The 42% increase in NDVI indicates significant vegetation growth in the region."}

Now provide the JSON:`;
          break;
          
        case 'satellite':
          const futureTime = new Date(Date.now() + (2 + Math.random() * 10) * 60 * 60 * 1000).toISOString();
          promptText = `You are a satellite tracking expert. Predict the next satellite pass for these coordinates.

Current date: ${currentDate}
Latitude: ${lat}
Longitude: ${lon}

IMPORTANT: You MUST respond with ONLY a valid JSON object. No other text, no explanations, no markdown.
Your response must be exactly in this format:
{"passTime": "<ISO 8601 UTC timestamp>", "satelliteName": "<satellite name>", "status": "Active", "speed": <7.5-7.8>}

Example: {"passTime": "${futureTime}", "satelliteName": "Landsat 9", "status": "Active", "speed": 7.59}

Now provide the JSON:`;
          break;
          
        case 'weather':
          promptText = `You are a weather service. Provide a detailed weather report for these coordinates.

Current date: ${currentDate}
Latitude: ${lat}
Longitude: ${lon}

IMPORTANT: You MUST respond with ONLY a valid JSON object. No other text, no explanations, no markdown.
Your response must include current weather and 4-hour forecast with this format:
{
  "current": {"temperature": <number>, "conditions": "<text>", "humidity": <0-100>, "windSpeed": <number>, "iconName": "Sun"},
  "forecast": [
    {"time": "10:00 AM", "temperature": <number>, "conditions": "<text>", "iconName": "Sun"},
    {"time": "1:00 PM", "temperature": <number>, "conditions": "<text>", "iconName": "Cloud"},
    {"time": "4:00 PM", "temperature": <number>, "conditions": "<text>", "iconName": "CloudRain"},
    {"time": "7:00 PM", "temperature": <number>, "conditions": "<text>", "iconName": "Moon"}
  ],
  "summary": "<one sentence>"
}

Now provide the JSON:`;
          break;
          
        case 'crop-yield':
          promptText = `You are an agricultural scientist. Predict crop yield for this location and crop.

Latitude: ${lat}
Longitude: ${lon}
Crop Type: ${sanitizeInput(inputData.cropType || 'Maize')}
Current date: ${currentDate}

IMPORTANT: You MUST respond with ONLY a valid JSON object. No other text.
Your response must be exactly in this format:
{"predictedYield": <number in tons/hectare>, "crop": "<crop name>", "confidence": <0-1>, "notes": "<factors affecting yield>"}

Example: {"predictedYield": 4.5, "crop": "Maize", "confidence": 0.78, "notes": "Good soil conditions expected based on regional climate patterns."}

Now provide the JSON:`;
          break;
          
        case 'drought-flood':
          promptText = `You are a hydrologist. Assess drought and flood risk for this location.

Latitude: ${lat}
Longitude: ${lon}
Current date: ${currentDate}

IMPORTANT: You MUST respond with ONLY a valid JSON object. No other text.
Your response must be exactly in this format:
{"droughtRisk": "<Low|Medium|High>", "floodRisk": "<Low|Medium|High>", "summary": "<explanation of risk factors>", "confidence": <0-1>}

Example: {"droughtRisk": "Medium", "floodRisk": "Low", "summary": "Below average rainfall expected this season. No significant flood risk due to elevation.", "confidence": 0.75}

Now provide the JSON:`;
          break;
          
        case 'soil-moisture':
          promptText = `You are a soil scientist. Predict soil moisture for this location.

Latitude: ${lat}
Longitude: ${lon}
Current date: ${currentDate}

IMPORTANT: You MUST respond with ONLY a valid JSON object. No other text.
Your response must be exactly in this format:
{"volumetricWaterContent": <percentage 0-100>, "summary": "<soil moisture condition>", "confidence": <0-1>}

Example: {"volumetricWaterContent": 28.5, "summary": "Optimal moisture for most crops. No immediate irrigation needed.", "confidence": 0.82}

Now provide the JSON:`;
          break;
          
        case 'irrigation':
          promptText = `You are an irrigation specialist. Create an irrigation schedule for this location.

Latitude: ${lat}
Longitude: ${lon}
Current date: ${currentDate}

IMPORTANT: You MUST respond with ONLY a valid JSON object. No other text.
Your response must be exactly in this format:
{"recommendation": "<action recommendation>", "nextIrrigationDate": "<YYYY-MM-DD>", "wateringDepthInches": <number>, "notes": "<reasoning>"}

Example: {"recommendation": "Irrigate in 3 days", "nextIrrigationDate": "2026-01-26", "wateringDepthInches": 1.5, "notes": "Soil moisture declining, no rain expected this week."}

Now provide the JSON:`;
          break;
          
        case 'crop-plan':
          promptText = `You are an agronomist. Create a crop plan for this location.

Latitude: ${lat}
Longitude: ${lon}
Current date: ${currentDate}

IMPORTANT: You MUST respond with ONLY a valid JSON object. No other text.
Your response must be exactly in this format:
{
  "suitableCrops": [{"name": "<crop>", "reason": "<why suitable>"}],
  "plantingWindow": {"start": "<month>", "end": "<month>"},
  "cooperativeFarmingSuggestion": "<suggestion for farmers>"
}

Now provide the JSON:`;
          break;
          
        case 'suggest-crop':
          promptText = `You are an agricultural advisor. Suggest the best crop for this farm.

Latitude: ${lat}
Longitude: ${lon}
Climate: ${sanitizeInput(inputData.climateDescription || 'Unknown')}
Current Crop: ${sanitizeInput(inputData.currentCrop || 'None')}

IMPORTANT: You MUST respond with ONLY a valid JSON object. No other text.
Your response must be exactly in this format:
{
  "suggestedCrop": "<crop name>",
  "suitabilityScore": <0-100>,
  "reasoning": "<detailed explanation>",
  "alternativeCrop": "<alternative>",
  "fetchedSoilType": "<soil type>",
  "fetchedMoistureLevel": "<Dry|Optimal|Wet>"
}

Now provide the JSON:`;
          break;
          
        case 'crop-advice':
          promptText = `You are an agricultural expert. Provide detailed advice for growing this crop.

Crop: ${sanitizeInput(inputData.crop || 'Unknown')}
Latitude: ${lat}
Longitude: ${lon}
Climate: ${sanitizeInput(inputData.climateDescription || 'Unknown')}

IMPORTANT: You MUST respond with ONLY a valid JSON object. No other text.
Your response must be exactly in this format:
{
  "crop": "<crop name>",
  "plantingDensity": {"value": <number>, "unit": "seeds/hectare"},
  "pestAndDiseaseRisks": [{"name": "<pest/disease>", "description": "<mitigation>"}],
  "fertilizationStrategy": [{"timing": "<when>", "recommendation": "<what to apply>"}],
  "notes": "<summary advice>"
}

Now provide the JSON:`;
          break;
          
        case 'scenario':
          promptText = `You are an environmental scientist. Analyze this what-if scenario.

Scenario: ${sanitizeInput(inputData.scenarioDescription)}
Latitude: ${lat}
Longitude: ${lon}

IMPORTANT: You MUST respond with ONLY a valid JSON object. No other text.
Your response must be exactly in this format:
{"scenario": "<scenario confirmation>", "likelyImpact": "<detailed impact analysis>", "confidence": <0-1>}

Example: {"scenario": "2°C temperature increase", "likelyImpact": "Would likely reduce wheat yields by 10-15%, increase water stress on crops, and shift optimal growing zones northward.", "confidence": 0.72}

Now provide the JSON:`;
          break;
          
        case 'report-summary':
          promptText = `You are a data analyst. Generate a summary report for this environmental data.

Location: ${sanitizeInput(inputData.location || inputData.locationDescription || `${lat}, ${lon}`)}
Date Range: ${sanitizeInput(inputData.dateRange || 'Not specified')}
Metrics Data: ${sanitizeInput(inputData.metricsData || JSON.stringify(inputData.metrics || inputData))}

IMPORTANT: You MUST respond with ONLY a valid JSON object. No other text.
Your response must be exactly in this format:
{"summaryReport": "<comprehensive markdown-formatted report with Executive Summary, Key Findings, and Recommendations>"}

Now provide the JSON:`;
          break;

        case 'chatbot':
          const messages = inputData.messages as any[];
          const historyText = messages.map(m => `${sanitizeInput(m.role)}: ${sanitizeInput(m.content)}`).join('\n');
          promptText = `You are Stark, the friendly AI guide for the Earth Insights Dashboard. 
Your personality is curious, encouraging, and enthusiastic about data and space.

Conversation History:
${historyText}

${lat ? `Location context: Latitude ${lat}, Longitude ${lon}.` : ''}

Respond to the user's last message in a helpful and concise way. Do NOT return JSON. Return ONLY the plain text of your response.`;
          break;

        case 'analyze-change':
          promptText = `You are an environmental change analyst. Analyze these environmental metrics for changes.

Location: ${sanitizeInput(inputData.location?.description || `${inputData.location?.latitude}, ${inputData.location?.longitude}`)}
Date Range: ${sanitizeInput(inputData.dateRange?.start || 'Unknown')} to ${sanitizeInput(inputData.dateRange?.end || 'Unknown')}
Metrics:
${sanitizeInput(inputData.metricsText || JSON.stringify(inputData.metrics || []))}
Historical Context: ${sanitizeInput(inputData.historicalContext || 'None provided')}

IMPORTANT: You MUST respond with ONLY a valid JSON object. No other text.
Your response must be exactly in this format:
{
  "classification": "<Normal|Transitional|Concerning|Critical>",
  "confidenceScore": <0-1>,
  "explanation": "<detailed explanation of detected changes and their implications>",
  "recommendedAction": "<recommended action based on classification>"
}

Now provide the JSON:`;
          break;
          
        default:
          const inputDescription = Object.entries(inputData)
            .map(([key, value]) => `${key}: ${sanitizeInput(JSON.stringify(value))}`)
            .join('\n');
          promptText = `Analyze this data and provide relevant output in JSON format.

Input:
${inputDescription}

IMPORTANT: You MUST respond with ONLY a valid JSON object. No other text, no explanations.

Now provide the JSON:`;
      }
    }
    
    // Try multi-provider fallback
    const multiProviderResponse = await generateWithMultiProvider({ prompt: promptText });
    console.log(`[AI] ✓ Success with ${multiProviderResponse.provider}: ${multiProviderResponse.model}`);
    return { text: multiProviderResponse.text };
  } catch (multiProviderError: any) {
    const errorMsg = multiProviderError?.message || 'Unknown fallback error';
    console.warn(`[AI] All free providers failed: ${errorMsg}`);
    throw new Error(`AI Service Unavailable: Both Gemini and fallback providers (Groq/Mistral/HF) failed. Please check your API keys. Last error: ${errorMsg}`);
  }
  
  throw lastError || new Error('All AI providers exhausted (Gemini failed, free providers unavailable)');
}

/**
 * Execute an AI generation with model fallback.
 * Automatically tries multiple models if the primary one fails.
 * 
 * @param generateFn - Function that performs AI generation, receives model name
 * @param config - Optional configuration
 * @returns The generation result
 */
export async function generateWithModelFallback<T>(
  generateFn: (modelName: string) => Promise<T>,
  config?: FallbackConfig
): Promise<T> {
  const models = config?.models || DEFAULT_MODELS;
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config?.retryConfig };
  
  let lastError: Error | null = null;
  
  for (const model of models) {
    for (let attempt = 0; attempt < (retryConfig.maxRetries || 3); attempt++) {
      try {
        console.log(`[AI] Attempting generation with model: ${model} (attempt ${attempt + 1})`);
        return await generateFn(model);
      } catch (error: any) {
        lastError = error;
        
        // If model not found, immediately try next model
        if (shouldTryNextModel(error)) {
          console.warn(`[AI] Model ${model} not available, trying next fallback...`);
          break; // Exit retry loop, try next model
        }
        
        // If rate limited, retry with backoff
        if (isRetryableError(error)) {
          const delay = calculateDelay(
            retryConfig.retryDelayMs || 1000,
            attempt,
            retryConfig.exponentialBackoff || true
          );
          console.warn(`[AI] Rate limit on ${model} (attempt ${attempt + 1}/${retryConfig.maxRetries}). Waiting ${delay}ms...`);
          await sleep(delay);
          continue;
        }
        
        // Other errors - throw immediately
        throw error;
      }
    }
  }
  
  throw lastError || new Error('All AI models and retry attempts exhausted');
}

/**
 * Safely parse JSON response from AI with fallback
 * Handles cases where AI returns markdown code blocks or extra text
 */
export function safeParseAIJson<T>(text: string, validator?: (data: any) => T): T {
  let cleanedText = text.trim();
  
  // Remove markdown code blocks if present
  if (cleanedText.startsWith('```json')) {
    cleanedText = cleanedText.slice(7);
  } else if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.slice(3);
  }
  
  if (cleanedText.endsWith('```')) {
    cleanedText = cleanedText.slice(0, -3);
  }
  
  cleanedText = cleanedText.trim();
  
  // Try to find JSON object in the text
  const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanedText = jsonMatch[0];
  }
  
  try {
    const parsed = JSON.parse(cleanedText);
    return validator ? validator(parsed) : parsed;
  } catch (e) {
    console.error('[AI] Failed to parse JSON response:', text);
    throw new Error('AI returned invalid JSON format. Please try again.');
  }
}

/**
 * Log AI operation for debugging and monitoring
 */
export function logAIOperation(
  operation: string,
  model: string,
  success: boolean,
  durationMs?: number,
  error?: string
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    operation,
    model,
    success,
    durationMs,
    error,
  };
  
  if (success) {
    console.log(`[AI] ✓ ${operation} completed with ${model}${durationMs ? ` in ${durationMs}ms` : ''}`);
  } else {
    console.error(`[AI] ✗ ${operation} failed with ${model}: ${error}`);
  }
}
