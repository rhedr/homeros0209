// src/ai/flows/generate-report.ts
'use server';

/**
 * @fileOverview Generates a markdown report based on selected threads, tags, and time range.
 *
 * - generateReport - A function that handles the report generation process.
 * - GenerateReportInput - The input type for the generateReport function.
 * - GenerateReportOutput - The return type for the generateReport function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateReportInputSchema = z.object({
  title: z.string().describe('The title of the report.'),
  inputs: z
    .object({
      timeRange: z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional()
        .describe('The time range to filter the report by.'),
      tagFilters: z
        .array(z.string())
        .optional()
        .describe('The tags to filter the report by.'),
      threadIds: z
        .array(z.string())
        .optional()
        .describe('The thread IDs to include in the report.'),
    })
    .describe('The inputs for the report generation.'),
});
export type GenerateReportInput = z.infer<typeof GenerateReportInputSchema>;

const GenerateReportOutputSchema = z.object({
  markdown: z.string().describe('The markdown content of the report.'),
});
export type GenerateReportOutput = z.infer<typeof GenerateReportOutputSchema>;

export async function generateReport(input: GenerateReportInput): Promise<GenerateReportOutput> {
  return generateReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateReportPrompt',
  input: { schema: GenerateReportInputSchema },
  output: { schema: GenerateReportOutputSchema },
  prompt: `You are an AI assistant tasked with generating a markdown report based on provided context.

  The report should have a title: {{{title}}}

  It should include an executive summary, themes, decisions, and next steps, based on the following inputs:

  Time Range: {{#if inputs.timeRange}}From {{inputs.timeRange.startDate}} to {{inputs.timeRange.endDate}}{{else}}No time range specified.{{/if}}
  Tags: {{#if inputs.tagFilters}}{{{inputs.tagFilters}}}{{else}}No tags specified.{{/if}}
  Thread IDs: {{#if inputs.threadIds}}{{{inputs.threadIds}}}{{else}}No thread IDs specified.{{/if}}

  Please generate the markdown report.
  `,
});

const generateReportFlow = ai.defineFlow(
  {
    name: 'generateReportFlow',
    inputSchema: GenerateReportInputSchema,
    outputSchema: GenerateReportOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
