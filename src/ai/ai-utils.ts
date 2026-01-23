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
  MODELS.fallback,  // gemini-1.5-flash
  MODELS.pro,       // gemini-1.5-pro (most capable)
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
 * @returns The prompt response
 */
export async function executePromptWithFallback<TInput, TOutput>(
  promptFn: (input: TInput) => Promise<{ text: string }>,
  input: TInput,
  config?: FallbackConfig
): Promise<{ text: string }> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config?.retryConfig };
  
  // FIRST: Try Google Gemini (but with AGGRESSIVE rate limit protection)
  let lastError: Error | null = null;
  console.log('[AI] Attempting Gemini (gemini-1.5-flash - with rate limit protection)...');
  
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

  // SECOND: Try free providers as backup (Groq → HuggingFace ONLY)
  try {
    console.log('[AI] Attempting 100% FREE providers (Groq → HuggingFace)...');
    
    // Generate a simple prompt text from the input
    const promptText = typeof input === 'string' 
      ? input 
      : JSON.stringify(input);
    
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
