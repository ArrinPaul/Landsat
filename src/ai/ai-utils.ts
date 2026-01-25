/**
 * @fileOverview Utility functions for AI operations with fallback mechanisms.
 * Provides retry logic and model fallback for handling API rate limits and errors.
 * Supports multi-provider setup: Groq → HuggingFace → Mistral → Google Gemini
 */

import { ai, MODELS } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { generateWithFallback as generateWithMultiProvider } from '@/ai/providers';

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
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config?.retryConfig };
  
  // FIRST: Try Google Gemini (but with AGGRESSIVE rate limit protection)
  let lastError: Error | null = null;
  console.log('[AI] Attempting Gemini (gemini-2.0-flash - with rate limit protection)...');
  
  // ONLY 1 ATTEMPT for Gemini to prevent hitting daily limits!
  const MAX_GEMINI_ATTEMPTS = 1; // Prevents overuse and billing charges
  
  for (let attempt = 0; attempt < MAX_GEMINI_ATTEMPTS; attempt++) {
    try {
      const response = await promptFn(input);
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
    
    if (typeof input === 'string') {
      promptText = input;
    } else {
      const inputData = input as Record<string, any>;
      const currentDate = new Date().toISOString();
      
      // Detect flow type from flowHint or input structure
      let detectedFlow = flowHint;
      
      if (!detectedFlow) {
        // Auto-detect based on input fields
        if ('locationDescription' in inputData) detectedFlow = 'coordinates';
        else if ('metricName' in inputData && 'firstValue' in inputData) detectedFlow = 'insights';
        else if ('cropType' in inputData && 'soilType' in inputData) detectedFlow = 'crop-advice';
        else if ('season' in inputData && 'climate' in inputData) detectedFlow = 'suggest-crop';
        else if ('cropName' in inputData && 'currentStage' in inputData) detectedFlow = 'irrigation';
        else if ('latitude' in inputData && 'longitude' in inputData) detectedFlow = 'satellite';
        else detectedFlow = 'generic';
      }
      
      const lat = inputData.latitude;
      const lon = inputData.longitude;
      
      switch (detectedFlow) {
        case 'coordinates':
          promptText = `You are a geography expert. Given a location description, suggest relevant latitude and longitude coordinates.

Location Description: ${inputData.locationDescription}

IMPORTANT: You MUST respond with ONLY a valid JSON object. No other text, no explanations, no markdown.
Your response must be exactly in this format:
{"latitude": <number>, "longitude": <number>, "confidence": <number between 0 and 1>}

Example: {"latitude": 48.8566, "longitude": 2.3522, "confidence": 0.95}

Now provide the JSON:`;
          break;
          
        case 'insights':
          promptText = `You are an environmental data analyst. Given metric data, provide a concise one-sentence insight.

Metric: ${inputData.metricName}
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
          
        case 'suggest-crop':
          promptText = `You are an agricultural expert. Suggest the best crops for these conditions.

Season: ${inputData.season || 'Unknown'}
Climate: ${inputData.climate || 'Unknown'}
Soil Type: ${inputData.soilType || 'Unknown'}

IMPORTANT: You MUST respond with ONLY a valid JSON object. No other text.
Your response must be exactly in this format:
{"suggestedCrops": ["<crop1>", "<crop2>", "<crop3>"], "reasoning": "<brief explanation>"}

Now provide the JSON:`;
          break;
          
        case 'crop-advice':
          promptText = `You are an agricultural advisor. Provide advanced advice for this crop.

Crop: ${inputData.cropType || 'Unknown'}
Soil: ${inputData.soilType || 'Unknown'}

IMPORTANT: You MUST respond with ONLY a valid JSON object. No other text.
Your response must include advice on fertilizers, pest control, irrigation, and best practices.
Format: {"advice": {"fertilizers": "<text>", "pestControl": "<text>", "irrigation": "<text>", "bestPractices": "<text>"}}

Now provide the JSON:`;
          break;
          
        case 'irrigation':
          promptText = `You are an irrigation specialist. Create an irrigation schedule for this crop.

Crop: ${inputData.cropName || 'Unknown'}
Current Stage: ${inputData.currentStage || 'Unknown'}

IMPORTANT: You MUST respond with ONLY a valid JSON object. No other text.
Format: {"schedule": [{"day": "<day>", "waterAmount": <liters>, "notes": "<text>"}], "recommendations": "<text>"}

Now provide the JSON:`;
          break;
          
        default:
          const inputDescription = Object.entries(inputData)
            .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
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
    console.warn(`[AI] All free providers failed: ${multiProviderError?.message}`);
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
