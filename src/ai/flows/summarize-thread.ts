
'use server';

/**
 * @fileOverview Summarizes a thread to generate a title and snippet.
 *
 * - summarizeThreadForTitle - A function that generates a title and snippet for a thread.
 * - SummarizeThreadForTitleInput - The input type for the summarizeThreadForTitle function.
 * - SummarizeThreadForTitleOutput - The return type for the summarizeThreadForTitle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeThreadForTitleInputSchema = z.object({
  threadText: z.string().describe('The text content of the thread to summarize for a title and snippet.'),
});
export type SummarizeThreadForTitleInput = z.infer<typeof SummarizeThreadForTitleInputSchema>;

const SummarizeThreadForTitleOutputSchema = z.object({
  title: z.string().describe('A concise, descriptive title for the thread, under 10 words.'),
  snippet: z.string().describe('A short, one-sentence summary of the thread, under 80 characters.'),
});
export type SummarizeThreadForTitleOutput = z.infer<typeof SummarizeThreadForTitleOutputSchema>;

export async function summarizeThreadForTitle(
  input: SummarizeThreadForTitleInput
): Promise<SummarizeThreadForTitleOutput> {
  return summarizeThreadForTitleFlow(input);
}

const summarizeThreadPrompt = ai.definePrompt({
  name: 'summarizeThreadForTitlePrompt',
  input: {schema: SummarizeThreadForTitleInputSchema},
  output: {schema: SummarizeThreadForTitleOutputSchema},
  prompt: `Based on the following conversation, generate a concise, descriptive title (under 10 words) and a one-sentence summary (snippet) that is under 80 characters.

Conversation Text:
{{{threadText}}}

Return the result as a JSON object with "title" and "snippet" fields.`,
});

const summarizeThreadForTitleFlow = ai.defineFlow(
  {
    name: 'summarizeThreadForTitleFlow',
    inputSchema: SummarizeThreadForTitleInputSchema,
    outputSchema: SummarizeThreadForTitleOutputSchema,
  },
  async input => {
    const {output} = await summarizeThreadPrompt(input);
    return output!;
  }
);
