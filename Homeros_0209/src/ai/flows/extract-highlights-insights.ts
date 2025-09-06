'use server';

/**
 * @fileOverview AI flow for extracting highlights and insights from a thread.
 *
 * - extractHighlightsAndInsights - Extracts highlights and insights from a given text.
 * - ExtractHighlightsAndInsightsInput - The input type for the extractHighlightsAndInsights function.
 * - ExtractHighlightsAndInsightsOutput - The return type for the extractHighlightsAndInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractHighlightsAndInsightsInputSchema = z.object({
  text: z.string().describe('The text to extract highlights and insights from.'),
});
export type ExtractHighlightsAndInsightsInput = z.infer<typeof ExtractHighlightsAndInsightsInputSchema>;

const ExtractHighlightsAndInsightsOutputSchema = z.object({
  highlights: z.array(z.string()).describe('The extracted highlights from the text.'),
  insights: z
    .array(
      z.object({
        type: z.string().describe('The type of insight (e.g., theme, decision, todo, fact).'),
        text: z.string().describe('The text of the insight.'),
        rationale: z.string().describe('The rationale for the insight.'),
        sourceIds: z.array(z.string()).describe('The IDs of the source messages for the insight.'),
      })
    )
    .describe('The extracted insights from the text.'),
});
export type ExtractHighlightsAndInsightsOutput = z.infer<typeof ExtractHighlightsAndInsightsOutputSchema>;

export async function extractHighlightsAndInsights(
  input: ExtractHighlightsAndInsightsInput
): Promise<ExtractHighlightsAndInsightsOutput> {
  return extractHighlightsAndInsightsFlow(input);
}

const extractHighlightsAndInsightsPrompt = ai.definePrompt({
  name: 'extractHighlightsAndInsightsPrompt',
  input: {schema: ExtractHighlightsAndInsightsInputSchema},
  output: {schema: ExtractHighlightsAndInsightsOutputSchema},
  prompt: `You are an AI assistant tasked with extracting key highlights and insights from a given text.

  Analyze the following text and identify the most important highlights and insights.

  Return the highlights as a simple array of strings. Return the insights as an array of objects, each with a type, text, rationale, and sourceIds.

  Text: {{{text}}}
  `,
});

const extractHighlightsAndInsightsFlow = ai.defineFlow(
  {
    name: 'extractHighlightsAndInsightsFlow',
    inputSchema: ExtractHighlightsAndInsightsInputSchema,
    outputSchema: ExtractHighlightsAndInsightsOutputSchema,
  },
  async input => {
    const {output} = await extractHighlightsAndInsightsPrompt(input);
    return output!;
  }
);
