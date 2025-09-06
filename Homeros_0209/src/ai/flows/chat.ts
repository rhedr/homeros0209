'use server';
/**
 * @fileoverview A conversational AI flow.
 *
 * - chat - A function that handles the chat process.
 */

import {ai} from '@/ai/genkit';
import {
  ChatInputSchema,
  ChatOutputSchema,
  type ChatInput,
  type ChatOutput,
} from './types/chat-types';

const chatPrompt = ai.definePrompt({
  name: 'chatPrompt',
  input: {schema: ChatInputSchema},
  output: {schema: ChatOutputSchema},
  prompt: `You are a helpful AI assistant named Homeros. Your goal is to provide accurate and insightful information.

You will be given the chat history and a new message. Respond to the new message in a conversational way, using the context from the history.

History:
{{#each history}}
- {{role}}: {{text}}
{{/each}}

New Message:
- user: {{{message}}}

Your Response:`,
});

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async input => {
    const {output} = await chatPrompt(input);
    return output!;
  }
);

export async function chat(input: ChatInput): Promise<ChatOutput> {
  return chatFlow(input);
}
