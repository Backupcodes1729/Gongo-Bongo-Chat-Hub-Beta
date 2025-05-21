
'use server';
/**
 * @fileOverview A Genkit flow for the Gemini Chat Bot.
 *
 * - geminiChatBotFlow - A function that takes a user's message and returns the bot's response.
 * - GeminiChatBotInput - The input type for the geminiChatBotFlow function.
 * - GeminiChatBotOutput - The return type for the geminiChatBotFlow function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeminiChatBotInputSchema = z.object({
  message: z.string().describe('The user message to the bot.'),
  // Optional: Add history if you want the bot to be aware of previous turns
  // history: z.array(z.object({ user: z.string(), bot: z.string() })).optional(), 
});
export type GeminiChatBotInput = z.infer<typeof GeminiChatBotInputSchema>;

const GeminiChatBotOutputSchema = z.object({
  response: z.string().describe("The bot's response to the user's message."),
});
export type GeminiChatBotOutput = z.infer<typeof GeminiChatBotOutputSchema>;

export async function geminiChatBot(input: GeminiChatBotInput): Promise<GeminiChatBotOutput> {
  return geminiChatBotFlow(input);
}

const prompt = ai.definePrompt({
  name: 'geminiChatBotPrompt',
  input: {schema: GeminiChatBotInputSchema},
  output: {schema: GeminiChatBotOutputSchema},
  prompt: `You are Gemini Bot, a friendly and helpful chat companion integrated into the Gongo Bongo Chat Hub.
  Your goal is to have a natural, concise, and engaging conversation.
  Keep your responses relatively short, like a real chat message.
  Avoid overly long paragraphs.
  
  User's message: "{{{message}}}"
  
  Your response:`,
});

const geminiChatBotFlow = ai.defineFlow(
  {
    name: 'geminiChatBotFlow',
    inputSchema: GeminiChatBotInputSchema,
    outputSchema: GeminiChatBotOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

    