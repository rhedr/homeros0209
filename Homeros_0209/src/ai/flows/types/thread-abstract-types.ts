/**
 * @fileOverview Types for the thread abstract generation flow.
 */
import {z} from 'genkit';

const MessageSchema = z.object({
    id: z.string().describe('The unique identifier for the message.'),
    role: z.enum(['user', 'ai']),
    text: z.string(),
});

export const GenerateThreadAbstractInputSchema = z.object({
  messages: z.array(MessageSchema).describe('The messages in the thread to abstract.'),
});
export type GenerateThreadAbstractInput = z.infer<typeof GenerateThreadAbstractInputSchema>;

export const GenerateThreadAbstractOutputSchema = z.object({
  abstract: z.string().describe('A dynamic abstraction of the conversation, under 100 characters.'),
  keyPoints: z.array(z.string()).describe('A list of 4-7 key points from the conversation.'),
  actionItems: z.array(z.string()).describe('A list of 2-4 actionable next steps for the user based on the conversation.'),
  references: z.array(z.object({
    text: z.string().describe('The reference text.'),
    messageId: z.string().describe('The ID of the message containing the reference.'),
  })).optional().describe('A list of any references or sources mentioned in the conversation, including the ID of the message they appear in.'),
});
export type GenerateThreadAbstractOutput = z.infer<typeof GenerateThreadAbstractOutputSchema>;
export type Reference = z.infer<typeof GenerateThreadAbstractOutputSchema.shape.references.element>;
