
'use server';

/**
 * @fileOverview Generates a short, dynamic abstract, key points, and references for a thread.
 *
 * - generateThreadAbstract - A function that generates an abstract for a thread.
 * - GenerateThreadAbstractInput - The input type for the generateThreadAbstract function.
 * - GenerateThreadAbstractOutput - The return type for the generateThreadAbstract function.
 */

import {ai} from '@/ai/genkit';
import {
  GenerateThreadAbstractInputSchema,
  GenerateThreadAbstractOutputSchema,
  type GenerateThreadAbstractInput,
  type GenerateThreadAbstractOutput,
} from './types/thread-abstract-types';

export async function generateThreadAbstract(
  input: GenerateThreadAbstractInput
): Promise<GenerateThreadAbstractOutput> {
  return generateThreadAbstractFlow(input);
}

const generateThreadAbstractPrompt = ai.definePrompt({
  name: 'generateThreadAbstractPrompt',
  input: {schema: GenerateThreadAbstractInputSchema},
  output: {schema: GenerateThreadAbstractOutputSchema},
  prompt: `Based on the following conversation, generate:
  1. A short, dynamic abstract of the conversation (under 100 characters).
  2. A list of 4-7 key points that summarize the main topics.
  3. A list of 2-4 actionable next steps for the user.
  4. A list of any references or sources cited in the conversation. For each reference, provide the text of the reference and the 'messageId' of the message it came from.

Conversation Messages:
{{#each messages}}
- Message (id: {{id}}, role: {{role}}): {{{text}}}
{{/each}}


Return the result as a JSON object with "abstract", "keyPoints", "actionItems", and "references" fields. The "references" field MUST be an array of objects, each with a "text" and "messageId" property.`,
});

const generateThreadAbstractFlow = ai.defineFlow(
  {
    name: 'generateThreadAbstractFlow',
    inputSchema: GenerateThreadAbstractInputSchema,
    outputSchema: GenerateThreadAbstractOutputSchema,
  },
  async input => {
    const {output} = await generateThreadAbstractPrompt(input);
    return output!;
  }
);
