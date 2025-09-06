import { config } from 'dotenv';
config();

import '@/ai/flows/extract-highlights-insights.ts';
import '@/ai/flows/generate-report.ts';
import '@/ai/flows/summarize-thread.ts';
import '@/ai/flows/generate-embeddings.ts';
import '@/ai/flows/generate-knowledge-graph.ts';
import '@/ai/flows/chat.ts';
import '@/ai/flows/types/chat-types.ts';
import '@/ai/flows/generate-thread-abstract.ts';
import '@/ai/flows/types/thread-abstract-types.ts';
import '@/ai/flows/generate-search-query.ts';
import '@/ai/flows/types/search-query-types.ts';
import '@/ai/flows/conversational-chat.ts';
import '@/ai/flows/types/conversational-chat-types.ts';
