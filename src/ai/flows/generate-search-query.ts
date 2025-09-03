
'use server';
/**
 * @fileoverview Generates a search query from a natural language input.
 *
 * - generateSearchQuery - A function that generates a search query.
 */

import {ai} from '@/ai/genkit';
import {
  GenerateSearchQueryInputSchema,
  GenerateSearchQueryOutputSchema,
  type GenerateSearchQueryInput,
  type GenerateSearchQueryOutput,
} from './types/search-query-types';

export async function generateSearchQuery(
  input: GenerateSearchQueryInput
): Promise<GenerateSearchQueryOutput> {
  return generateSearchQueryFlow(input);
}

const generateSearchQueryPrompt = ai.definePrompt({
  name: 'generateSearchQueryPrompt',
  input: {schema: GenerateSearchQueryInputSchema},
  output: {schema: GenerateSearchQueryOutputSchema},
  prompt: `You are an expert research assistant AI. Your sole purpose is to analyze a user's query and find the specific passages within a longer text that provide the most substantive and direct answer to that query.

Follow these instructions to achieve the best results:
1.  **Analyze Intent:** First, deeply understand the user's goal. Are they asking for a comparison, a definition, a list, a summary, or a specific piece of data?
2.  **Identify Substantive Answers:** Scan the provided thread content. Your primary goal is to find the parts of the text that contain the actual answer or the core information the user is looking for.
3.  **Ignore Conversational Filler:** You MUST IGNORE conversational pleasantries, acknowledgments, or promises to provide information. For example, if the user asks for a comparison and the text contains "Okay, I will prepare that comparison for you," you should IGNORE that sentence. Focus only on the text that CONTAINS the actual comparison.
4.  **Extract Verbatim:** Once you have identified the most relevant, information-rich passages, extract them verbatim. Do not summarize, rephrase, or alter the text in any way.
5.  **Return as Array:** Your final output must be a JSON object containing a 'searchQueries' array of these verbatim string passages.

User's Query:
"{{{userQuery}}}"

Content of the thread to search in:
---
{{{threadText}}}
---
`,
});

const generateSearchQueryFlow = ai.defineFlow(
  {
    name: 'generateSearchQueryFlow',
    inputSchema: GenerateSearchQueryInputSchema,
    outputSchema: GenerateSearchQueryOutputSchema,
  },
  async input => {
    const {output} = await generateSearchQueryPrompt(input);
    return output!;
  }
);
