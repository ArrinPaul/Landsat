
'use server';
/**
 * @fileOverview A flow for generating a time-lapse video of an environmental metric.
 * - generateTimelapseVideo - Generates a video from a text prompt derived from dashboard settings.
 * - GenerateTimelapseVideoInput - The input type for the function.
 * - GenerateTimelapseVideoOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'genkit';
import { format } from 'date-fns';

export const GenerateTimelapseVideoInputSchema = z.object({
  metricName: z.string().describe('The name of the metric being visualized, e.g., NDVI.'),
  locationDescription: z.string().describe('A description of the location, e.g., Amazon Rainforest.'),
  startDate: z.string().describe('The start date of the time-lapse (e.g., "Jan 01, 2023").'),
  endDate: z.string().describe('The end date of the time-lapse (e.g., "Dec 31, 2023").'),
});
export type GenerateTimelapseVideoInput = z.infer<typeof GenerateTimelapseVideoInputSchema>;

export const GenerateTimelapseVideoOutputSchema = z.object({
  videoDataUri: z.string().describe('The generated video as a data URI in MP4 format.'),
});
export type GenerateTimelapseVideoOutput = z.infer<typeof GenerateTimelapseVideoOutputSchema>;

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
    
    let { operation } = await ai.generate({
      model: googleAI.model('veo-2.0-generate-001'),
      prompt,
      config: {
        durationSeconds: 6,
        aspectRatio: '16:9',
      },
    });

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
    
    const fetch = (await import('node-fetch')).default;
    const videoResponse = await fetch(videoDownloadUrl);

    if (!videoResponse.ok || !videoResponse.body) {
        throw new Error(`Failed to download video file: ${videoResponse.statusText}`);
    }

    const videoBuffer = await videoResponse.buffer();
    const videoBase64 = videoBuffer.toString('base64');
    const videoDataUri = `data:video/mp4;base64,${videoBase64}`;

    return { videoDataUri };
  }
);
