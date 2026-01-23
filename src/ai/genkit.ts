import {genkit, z} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import { generateWithFallback as generateWithMultiProvider, getProviderStatus, getProviderLimits, AIProvider } from './providers';

// Log available providers on startup
const providerStatus = getProviderStatus();
const availableProviders = Object.entries(providerStatus)
  .filter(([_, available]) => available)
  .map(([provider]) => provider);

console.log('[AI] Available providers:', availableProviders.length > 0 ? availableProviders : 'NONE - Check .env file');
console.log('[AI] Provider limits:', getProviderLimits());

// Primary model configuration - using OLDER Gemini to save quota
// gemini-1.5-flash uses LESS quota than newer models, perfect for cost optimization
const PRIMARY_MODEL = 'googleai/gemini-1.5-flash'; // OLDER VERSION - saves quota
const FALLBACK_MODEL = 'googleai/gemini-1.5-pro';

// Initialize Genkit with primary Gemini model
export const ai = genkit({
  plugins: [googleAI()],
  model: PRIMARY_MODEL,
});

// Model constants for use in specific flows
export const MODELS = {
  primary: PRIMARY_MODEL,        // gemini-1.5-flash (quota-efficient)
  fallback: FALLBACK_MODEL,      // gemini-1.5-pro (fallback)
  fast: 'googleai/gemini-2.0-flash', // gemini-2.0 if needed
  pro: 'googleai/gemini-1.5-pro',    // high capability fallback
} as const;

// Utility function to execute AI generation with automatic model fallback (Gemini only)
export async function generateWithGeminiFallback<T>(
  generateFn: (model: string) => Promise<T>,
  options?: { maxRetries?: number; retryDelay?: number }
): Promise<T> {
  const { maxRetries = 2, retryDelay = 1000 } = options || {};
  const models = [PRIMARY_MODEL, FALLBACK_MODEL];
  
  let lastError: Error | null = null;
  
  for (const model of models) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await generateFn(model);
      } catch (error: any) {
        lastError = error;
        const errorMessage = error?.message || '';
        
        // Check if it's a rate limit error (429) or quota exceeded
        if (errorMessage.includes('429') || 
            errorMessage.includes('quota') || 
            errorMessage.includes('RESOURCE_EXHAUSTED') ||
            errorMessage.includes('rate limit')) {
          console.warn(`Rate limit hit on ${model}, attempt ${attempt + 1}/${maxRetries}. Waiting...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          continue;
        }
        
        // Check if it's a model not found error (404)
        if (errorMessage.includes('404') || errorMessage.includes('not found')) {
          console.warn(`Model ${model} not found, trying fallback...`);
          break; // Try next model
        }
        
        // For other errors, throw immediately
        throw error;
      }
    }
  }
  
  throw lastError || new Error('All AI models failed after retries');
}
