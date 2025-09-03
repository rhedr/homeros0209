import { processMessageReferences, updateThreadReferences, type ThreadReference } from './referenceProcessor';

export interface LegacyThreadData {
  id: string;
  title: string;
  snippet: string;
  updatedAt: string;
  category: string;
  tags: string[];
  messages: Array<{
    role: 'user' | 'ai';
    text: string;
    id: string;
    timestamp: string;
  }>;
  highlights: any[];
  references: Array<{
    text: string;
    messageId: string;
  }>;
  colorDescriptions?: Record<string, string>;
  // New fields might be missing
  threadReferences?: ThreadReference[];
  referenceCounter?: number;
}

export interface ModernThreadData extends LegacyThreadData {
  threadReferences: ThreadReference[];
  referenceCounter: number;
}

export function needsMigration(threadData: LegacyThreadData): boolean {
  // Check if thread needs migration to new reference system
  return !threadData.threadReferences || threadData.referenceCounter === undefined;
}

export function migrateThreadReferences(legacyThread: LegacyThreadData): ModernThreadData {
  console.log(`Migrating thread ${legacyThread.id} to new reference system...`);
  
  let threadReferences: ThreadReference[] = [];
  let processedMessages: typeof legacyThread.messages = [];
  
  // Process each message to extract and renumber references
  for (const message of legacyThread.messages) {
    const { processedText, newReferences } = processMessageReferences(
      message.text,
      message.id,
      threadReferences
    );
    
    // Update thread references with new ones
    threadReferences = updateThreadReferences(threadReferences, newReferences);
    
    // Store the processed message
    processedMessages.push({
      ...message,
      text: processedText
    });
  }
  
  const referenceCounter = Math.max(...threadReferences.map(r => r.number), 0);
  
  console.log(`Migration complete: ${threadReferences.length} references processed, counter at ${referenceCounter}`);
  
  return {
    ...legacyThread,
    messages: processedMessages,
    threadReferences,
    referenceCounter,
  };
}

export function migrateAllThreadsInStorage(): { migrated: number; total: number } {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { migrated: 0, total: 0 };
  }
  
  let migrated = 0;
  let total = 0;
  
  console.log('Starting bulk migration of threads...');
  
  // Get all thread keys
  const threadKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('thread-')) {
      threadKeys.push(key);
    }
  }
  
  for (const key of threadKeys) {
    try {
      total++;
      const threadDataStr = localStorage.getItem(key);
      if (!threadDataStr) continue;
      
      const threadData: LegacyThreadData = JSON.parse(threadDataStr);
      
      if (needsMigration(threadData)) {
        const migratedData = migrateThreadReferences(threadData);
        localStorage.setItem(key, JSON.stringify(migratedData));
        migrated++;
        console.log(`✅ Migrated thread: ${threadData.title}`);
      } else {
        console.log(`⏭️ Skipped thread (already migrated): ${threadData.title}`);
      }
    } catch (error) {
      console.error(`❌ Failed to migrate thread ${key}:`, error);
    }
  }
  
  console.log(`Migration complete: ${migrated}/${total} threads migrated`);
  return { migrated, total };
}

export function validateThreadMigration(threadData: ModernThreadData): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check basic structure
  if (!threadData.threadReferences) {
    issues.push('Missing threadReferences array');
  }
  
  if (threadData.referenceCounter === undefined) {
    issues.push('Missing referenceCounter');
  }
  
  // Check reference consistency
  if (threadData.threadReferences) {
    const numbers = threadData.threadReferences.map(r => r.number);
    const uniqueNumbers = new Set(numbers);
    
    if (numbers.length !== uniqueNumbers.size) {
      issues.push('Duplicate reference numbers detected');
    }
    
    // Check if references are properly numbered
    const expectedNumbers = Array.from({length: numbers.length}, (_, i) => i + 1);
    const sortedNumbers = [...numbers].sort((a, b) => a - b);
    
    if (JSON.stringify(sortedNumbers) !== JSON.stringify(expectedNumbers)) {
      issues.push('Reference numbers are not sequential starting from 1');
    }
    
    // Validate reference counter
    const maxNumber = Math.max(...numbers, 0);
    if (threadData.referenceCounter !== maxNumber) {
      issues.push(`Reference counter (${threadData.referenceCounter}) doesn't match max reference number (${maxNumber})`);
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}