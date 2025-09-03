
"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BookOpen, Loader2 } from "lucide-react";
import React from 'react';
import { cn } from "@/lib/utils";
import type { ActiveReference, ActiveHighlight, Highlight, CreateHighlightData } from "@/app/app/threads/[id]/page";
import { MessageRenderer } from './MessageRenderer';

type Message = {
  role: 'user' | 'ai';
  text: string;
  id: string;
  timestamp: string;
};

type ChatMessagesProps = {
    messages: Message[];
    highlights: Highlight[];
    onHighlightCreate: (highlight: CreateHighlightData) => void;
    searchQuery: string;
    activeMatch?: { messageId: string; startIndex: number; endIndex: number; };
    activeReference: ActiveReference;
    activeHighlight: ActiveHighlight;
    threadId: string;
};

export function ChatMessages({
  messages,
  onHighlightCreate,
  highlights,
  searchQuery,
  activeMatch,
  activeReference,
  activeHighlight,
  threadId,
}: ChatMessagesProps) {

  if (!messages || messages.length === 0) {
    return (
        <div className="flex-1 p-4 flex items-center justify-center">
            <p className="text-muted-foreground">Start the conversation by sending a message.</p>
        </div>
    );
  }

  return (
      <ScrollArea className="flex-1 p-4 relative">
        <div className="space-y-6">
          {messages.map((message) => {
            const { id: messageId, role } = message;
            
            return (
                <div
                  key={messageId}
                  id={messageId}
                  data-message-id-container={messageId}
                  className={cn('flex items-start gap-3 transition-all duration-300 group/message', role === 'user' ? 'justify-end' : '')}
                >
                  {role === 'ai' && (
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                            <BookOpen className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                  )}
                 
                  <div className={cn("max-w-4xl rounded-lg p-3 text-sm", role === 'user' ? 'bg-secondary' : 'bg-card')}>
                    {message.id === 'thinking' ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    ) : (
                      <MessageRenderer 
                        message={{...message, threadId}}
                        highlights={highlights}
                        onHighlightCreate={onHighlightCreate}
                      />
                    )}
                  </div>
                  
                   {role === 'user' && (
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                  )}
                </div>
            )
          })}
        </div>
      </ScrollArea>
  );
}
