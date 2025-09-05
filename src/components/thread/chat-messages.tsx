
"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BookOpen, Loader2, Copy as CopyIcon, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const copyTimer = React.useRef<number | null>(null);

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 10) {
        return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
      }
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
    } catch {
      return '';
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try { 
      await navigator.clipboard.writeText(text); 
      setCopiedId(id);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  };

  const handleShare = async (text: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {}
  };

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
                 
                  <div className={cn("max-w-4xl rounded-lg p-3 text-sm", role === 'user' ? 'bg-transparent' : 'bg-card')}>
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
                    <div className="mt-1 flex items-center justify-end gap-2 opacity-0 group-hover/message:opacity-100 transition-opacity">
                      <span className="text-xs italic text-muted-foreground">
                        {formatTimestamp(message.timestamp)}
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(message.id, message.text)} aria-label="Copy message">
                        {copiedId === message.id ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <CopyIcon className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleShare(message.text)} aria-label="Share message">
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
