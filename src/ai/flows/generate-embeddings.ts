'use server';
/**
 * @fileOverview A text embedding AI agent.
 *
 * - generateEmbeddings - A function that handles the text embedding process.
 * - GenerateEmbeddingsInput - The input type for the generateEmbeddings function.
 * - GenerateEmbeddingsOutput - The return type for the generateEmbeddings function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateEmbeddingsInputSchema = z.object({
  text: z.string().describe('The text to generate embeddings for.'),
});
export type GenerateEmbeddingsInput = z.infer<typeof GenerateEmbeddingsInputSchema>;

const GenerateEmbeddingsOutputSchema = z.object({
  embedding: z.array(z.number()).describe('The embedding vector for the text.'),
});
export type GenerateEmbeddingsOutput = z.infer<typeof GenerateEmbeddingsOutputSchema>;

export async function generateEmbeddings(input: GenerateEmbeddingsInput): Promise<GenerateEmbeddingsOutput> {
  return generateEmbeddingsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateEmbeddingsPrompt',
  input: {schema: GenerateEmbeddingsInputSchema},
  output: {schema: GenerateEmbeddingsOutputSchema},
  prompt: `Generate embeddings for the following text: {{{text}}}`,
});

const generateEmbeddingsFlow = ai.defineFlow(
  {
    name: 'generateEmbeddingsFlow',
    inputSchema: GenerateEmbeddingsInputSchema,
    outputSchema: GenerateEmbeddingsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
