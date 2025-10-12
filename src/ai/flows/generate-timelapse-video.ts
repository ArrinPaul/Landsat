
'use server';
/**
 * @fileOverview A flow for generating a time-lapse video of an environmental metric.
 * - generateTimelapseVideo - Generates a video from a text prompt derived from dashboard settings.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { GenerateTimelapseVideoInputSchema, GenerateTimelapseVideoOutputSchema, type GenerateTimelapseVideoInput, type GenerateTimelapseVideoOutput } from '@/lib/types';


export async function generateTimelapseVideo(input: GenerateTimelapseVideoInput): Promise<GenerateTimelapseVideoOutput> {
  return generateTimelapseVideoFlow(input);
}

const generateTimelapseVideoFlow = ai.defineFlow(
  {
    name: 'generateTimelapseVideoFlow',
    inputSchema: GenerateTimelapseVideoInputSchema,
    outputSchema: GenerateTimelapseVideoOutputSchema,
    // Increase timeout for video generation
    serverActionConfig: {
      maxDuration: 120, // 2 minutes
    },
  },
  async ({ metricName, locationDescription, startDate, endDate }) => {

    const prompt = `Create a cinematic, realistic time-lapse video showing the change in ${metricName} over the ${locationDescription} from ${startDate} to ${endDate}. 
      Show the landscape from a satellite's perspective. 
      If the metric is NDVI, visualize the change in vegetation greenness. 
      If it's NDWI, show the changes in surface water. 
      If it's NDBI, show the subtle expansion or contraction of built-up urban areas. 
      The video should be a smooth and continuous evolution.`;
    
    let operation;
    try {
        const result = await ai.generate({
            model: googleAI.model('veo-3.0-generate-preview'),
            prompt,
        });
        operation = result.operation;
    } catch (e: any) {
        const errorMessage = e.message || '';
        if (errorMessage.includes('FAILED_PRECONDITION') || errorMessage.includes('billing enabled')) {
            throw new Error("Video generation with Veo requires Google Cloud Platform billing to be enabled for your project. Please enable billing in your GCP account settings to use this feature.");
        }
        throw e;
    }


    if (!operation) {
      throw new Error('Video generation did not start correctly.');
    }

    // Poll for completion
    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
      operation = await ai.checkOperation(operation);
    }

    if (operation.error) {
      throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    const video = operation.output?.message?.content.find((p) => !!p.media);
    if (!video || !video.media?.url) {
      throw new Error('Failed to find the generated video in the operation output.');
    }

    // The URL from Veo is temporary and needs the API key for access.
    // We will fetch it server-side and convert to a data URI to send to the client.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set.");
    }
    const videoDownloadUrl = `${video.media.url}&key=${apiKey}`;
    
    let videoResponse;
    try {
        const fetch = (await import('node-fetch')).default;
        videoResponse = await fetch(videoDownloadUrl);
    } catch (error: any) {
        throw new Error(`Network error while downloading video file: ${error.message}`);
    }

    if (!videoResponse.ok || !videoResponse.body) {
        throw new Error(`Failed to download video file. Status: ${videoResponse.status} ${videoResponse.statusText}`);
    }

    const videoBuffer = await videoResponse.buffer();
    const videoBase64 = videoBuffer.toString('base64');
    const videoDataUri = `data:video/mp4;base64,${videoBase64}`;

    return { videoDataUri };
  }
);
