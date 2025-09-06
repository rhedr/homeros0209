/**
 * @fileOverview Types for the conversational chat flow.
 */
import {z} from 'genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'ai']),
  text: z.string(),
});

export const ConversationalChatInputSchema = z.object({
  history: z.array(MessageSchema).describe('The chat history.'),
  message: z.string().describe('The latest user message.'),
});
export type ConversationalChatInput = z.infer<typeof ConversationalChatInputSchema>;

export const ConversationalChatOutputSchema = z.object({
    message: z.string().describe('The AI-generated response.'),
});
export type ConversationalChatOutput = z.infer<typeof ConversationalChatOutputSchema>;
