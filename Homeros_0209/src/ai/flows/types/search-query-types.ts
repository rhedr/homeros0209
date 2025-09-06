/**
 * @fileOverview Types for the search query generation flow.
 */
import {z} from 'genkit';

export const GenerateSearchQueryInputSchema = z.object({
  userQuery: z.string().describe('The natural language query from the user.'),
  threadText: z.string().describe('The text content of the thread to search within.'),
});
export type GenerateSearchQueryInput = z.infer<typeof GenerateSearchQueryInputSchema>;

export const GenerateSearchQueryOutputSchema = z.object({
  searchQueries: z.array(z.string()).describe('The optimized search query strings to use for highlighting text.'),
});
export type GenerateSearchQueryOutput = z.infer<typeof GenerateSearchQueryOutputSchema>;
