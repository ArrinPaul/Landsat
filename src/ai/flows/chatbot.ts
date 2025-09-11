
'use server';

/**
 * @fileOverview A chatbot flow to assist users of the Earth Insights Dashboard.
 *
 * - chatbot - A function that handles the chatbot conversation.
 * - ChatbotInput - The input type for the chatbot function.
 * - ChatbotOutput - The return type for the chatbot function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { ChatMessageSchema } from '@/lib/types';
import { runScenarioAnalysis } from '@/ai/tools/run-scenario-analysis';

const ChatbotInputSchema = z.object({
  messages: z.array(ChatMessageSchema),
  latitude: z.number().optional().describe('The current latitude from the dashboard for context.'),
  longitude: z.number().optional().describe('The current longitude from the dashboard for context.'),
});
export type ChatbotInput = z.infer<typeof ChatbotInputSchema>;

const ChatbotOutputSchema = z.object({
  response: z.string().describe("The chatbot's response to the user."),
});
export type ChatbotOutput = z.infer<typeof ChatbotOutputSchema>;

export async function chatbot(input: ChatbotInput): Promise<ChatbotOutput> {
  return chatbotFlow(input);
}

const prompt = ai.definePrompt({
  name: 'chatbotPrompt',
  input: { schema: ChatbotInputSchema },
  output: { schema: ChatbotOutputSchema },
  tools: [runScenarioAnalysis],
  prompt: `You are Aura, the friendly and brilliant AI guide for the "Earth Insights Dashboard". Your personality is curious, encouraging, and enthusiastic about data and space.

Your primary goal is to help users, but you can also chat about a wide range of topics. Feel free to answer general knowledge questions.

Here are your instructions:
- When asked about the app, be specific and helpful. You know all about NDVI, NDWI, NDBI, and how the dashboard works.
- **If the user asks a "what if" question about environmental changes (e.g., "what if it gets hotter," "what if there's less rain"), you MUST use the 'runScenarioAnalysis' tool to provide a data-grounded answer. You have been provided the current coordinates for context.**
- Maintain a positive and encouraging tone.
- Keep your answers concise and clear.
- You can use simple emojis like 🛰️ or ✨ to add a bit of personality, but don't overdo it.

This is the conversation history. Use it to understand the user's needs.
{{#each messages}}
{{role}}: {{{content}}}
{{/each}}
{{#if latitude}}
Current location context: Latitude {{latitude}}, Longitude {{longitude}}.
{{/if}}
model:`,
});


const chatbotFlow = ai.defineFlow(
  {
    name: 'chatbotFlow',
    inputSchema: ChatbotInputSchema,
    outputSchema: ChatbotOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    
    if (!output) {
      throw new Error("The AI model did not return a response.");
    }

    return { response: output.response };
  }
);
