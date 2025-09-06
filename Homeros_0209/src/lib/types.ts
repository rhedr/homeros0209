import type { Timestamp } from 'firebase/firestore';

export interface BaseDoc {
  id: string;
  ownerUid: string;
  createdAt: Timestamp;
}

export interface Workspace extends BaseDoc {
  name: string;
}

export interface Thread extends BaseDoc {
  workspaceId: string;
  title: string;
  updatedAt: Timestamp;
  tags: string[];
}

export interface Message extends BaseDoc {
  threadId: string;
  role: 'user' | 'ai';
  text: string;
  tokens?: number;
  embedding?: number[];
  keyPhrases?: string[];
}

export interface Highlight extends BaseDoc {
  threadId: string;
  messageId: string;
  text: string;
  label?: string;
  embedding?: number[];
}

export interface Insight extends BaseDoc {
  threadId?: string;
  sourceIds: string[]; // messageId or highlightId
  type: 'theme' | 'decision' | 'todo' | 'fact';
  json: string; // JSON representation of the insight
  embedding?: number[];
}

export interface Summary extends BaseDoc {
  scope: 'thread' | 'workspace' | 'timeRange';
  sourceIds: string[];
  model: string;
  json: string; // JSON representation of the summary
}

export interface Report extends BaseDoc {
  title: string;
  inputs: {
    timeRange?: { startDate: string; endDate: string };
    tagFilters?: string[];
    threadIds?: string[];
  };
  markdown: string;
}

export interface GraphNode extends BaseDoc {
  label: string;
  kind: 'topic' | 'entity' | 'insight';
  refs: string[]; // IDs of related docs (e.g., insightId, messageId)
}

export interface GraphEdge extends BaseDoc {
  fromNodeId: string;
  toNodeId: string;
  relation: 'supports' | 'contradicts' | 'mentions' | 'derivedFrom';
  weight?: number;
}
