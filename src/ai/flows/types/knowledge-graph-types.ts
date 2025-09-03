/**
 * @fileOverview Types for the knowledge graph generation flow.
 *
 * - GenerateKnowledgeGraphInput - The input type for the generateKnowledgeGraph function.
 * - GenerateKnowledgeGraphOutput - The return type for the generateKnowledgeGraph function.
 */

import {z} from 'genkit';

const NodeSchema = z.object({
  id: z.string().describe('Unique identifier for the node.'),
  label: z.string().describe('Display label for the node.'),
  type: z.enum(['concept', 'entity', 'topic']).describe('The type of the node.'),
});

const EdgeSchema = z.object({
  id: z.string().describe('Unique identifier for the edge.'),
  source: z.string().describe('The ID of the source node.'),
  target: z.string().describe('The ID of the target node.'),
  label: z.string().describe('Display label for the relationship.'),
  directed: z.boolean().optional().describe('Whether the edge is directed.'),
});

export const GenerateKnowledgeGraphInputSchema = z.object({
  text: z.string().describe('The text to generate the knowledge graph from.'),
  sourceType: z
    .enum(['thread', 'tag', 'category'])
    .describe('The type of the source used for generation.'),
});
export type GenerateKnowledgeGraphInput = z.infer<
  typeof GenerateKnowledgeGraphInputSchema
>;

export const GenerateKnowledgeGraphOutputSchema = z.object({
  nodes: z.array(NodeSchema).describe('The nodes of the knowledge graph.'),
  edges: z
    .array(EdgeSchema)
    .describe('The edges connecting the nodes of the knowledge graph.'),
});
export type GenerateKnowledgeGraphOutput = z.infer<
  typeof GenerateKnowledgeGraphOutputSchema
>;
