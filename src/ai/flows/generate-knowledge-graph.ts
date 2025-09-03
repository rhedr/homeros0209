'use server';

/**
 * @fileOverview AI flow for generating a knowledge graph from text.
 *
 * - generateKnowledgeGraph - Generates a knowledge graph from a given text.
 */

import {ai} from '@/ai/genkit';
import {
  GenerateKnowledgeGraphInputSchema,
  GenerateKnowledgeGraphOutputSchema,
  type GenerateKnowledgeGraphInput,
  type GenerateKnowledgeGraphOutput,
} from './types/knowledge-graph-types';


export async function generateKnowledgeGraph(
  input: GenerateKnowledgeGraphInput
): Promise<GenerateKnowledgeGraphOutput> {
  return generateKnowledgeGraphFlow(input);
}

const generateKnowledgeGraphPrompt = ai.definePrompt({
  name: 'generateKnowledgeGraphPrompt',
  input: {schema: GenerateKnowledgeGraphInputSchema},
  output: {schema: GenerateKnowledgeGraphOutputSchema},
  prompt: `You are an expert in knowledge synthesis and graph theory. Your task is to analyze the provided text and construct a knowledge graph from it. The graph should represent the key concepts, entities, and their relationships in a meaningful way.

The source of the text is a {{sourceType}}.

- Identify the main concepts, topics, and named entities in the text. These will be your nodes.
- Create nodes for each identified item. Each node must have a unique ID, a descriptive label, and a type ('concept', 'entity', 'topic').
- Identify the relationships between these nodes. The relationships should be concise and descriptive, capturing the essence of the connection. Avoid generic phrases like "is related to" or "involves". Instead, use action-oriented or descriptive words from the text (e.g., "resolves", "proposes", "critiques", "depends on").
- Create edges to represent these relationships. Each edge must have a unique ID, a source node ID, a target node ID, and a label describing the relationship.

Return the graph as a JSON object with 'nodes' and 'edges' arrays.

Text to analyze:
{{{text}}}
`,
});

const generateKnowledgeGraphFlow = ai.defineFlow(
  {
    name: 'generateKnowledgeGraphFlow',
    inputSchema: GenerateKnowledgeGraphInputSchema,
    outputSchema: GenerateKnowledgeGraphOutputSchema,
  },
  async input => {
    const {output} = await generateKnowledgeGraphPrompt(input);
    return output!;
  }
);
