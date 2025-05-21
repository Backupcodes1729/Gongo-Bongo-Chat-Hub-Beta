'use server';

/**
 * @fileOverview AI summarization flow for summarizing long messages or conversations.
 *
 * - summarizeMessage - A function that summarizes the content of a given text.
 * - SummarizeMessageInput - The input type for the summarizeMessage function.
 * - SummarizeMessageOutput - The return type for the summarizeMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeMessageInputSchema = z.object({
  text: z.string().describe('The text to summarize.'),
});
export type SummarizeMessageInput = z.infer<typeof SummarizeMessageInputSchema>;

const SummarizeMessageOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the input text.'),
});
export type SummarizeMessageOutput = z.infer<typeof SummarizeMessageOutputSchema>;

export async function summarizeMessage(input: SummarizeMessageInput): Promise<SummarizeMessageOutput> {
  return summarizeMessageFlow(input);
}

const summarizeMessagePrompt = ai.definePrompt({
  name: 'summarizeMessagePrompt',
  input: {schema: SummarizeMessageInputSchema},
  output: {schema: SummarizeMessageOutputSchema},
  prompt: `Summarize the following text into a concise summary:

Text: {{{text}}}`,
});

const summarizeMessageFlow = ai.defineFlow(
  {
    name: 'summarizeMessageFlow',
    inputSchema: SummarizeMessageInputSchema,
    outputSchema: SummarizeMessageOutputSchema,
  },
  async input => {
    const {output} = await summarizeMessagePrompt(input);
    return output!;
  }
);
