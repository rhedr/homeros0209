// src/lib/mock-data.ts

export type MockThread = {
  id: string;
  title: string;
  updatedAt: string;
  snippet: string;
  category: string;
  tags: string[];
  messages: { role: 'user' | 'ai'; text: string }[];
};

export const initialThreads: MockThread[] = [];
