
"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BookOpen, Loader2 } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from "@/lib/utils";
import type { ActiveReference, ActiveHighlight, Highlight, CreateHighlightData } from "@/app/app/threads/[id]/page";
import { applyNormalizedHighlights } from '@/lib/highlightUtils';
import { calculateNormalizedOffsets } from '@/lib/textNormalization';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PaintBucket, X } from 'lucide-react';
import type { Message } from '@/app/app/threads/[id]/page';


interface SelectionInfo {
    text: string;
    start: number;
    end: number;
    messageId: string;
    rect: DOMRect;
}

const HighlightMenu = ({ selection, onHighlight, onClose }: { selection: SelectionInfo, onHighlight: (color: string) => void, onClose: () => void }) => {
  const colors = ['#ffeb3b', '#a5d6a7', '#90caf9', '#ffab91', '#ce93d8'];
  
  if (!selection || !selection.rect) return null;
  
  const style: React.CSSProperties = {
    position: 'fixed',
    top: `${selection.rect.top - 45}px`,
    left: `${selection.rect.left + selection.rect.width / 2}px`,
    transform: 'translateX(-50%)',
    background: 'white',
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 1000,
    display: 'flex',
    gap: '4px',
    alignItems: 'center'
  };
  
  return (
    <div style={style} className="highlight-menu" onMouseDown={(e) => e.preventDefault()}>
      <PaintBucket size={16} className="text-gray-600" />
      {colors.map(color => (
        <button
          key={color}
          onClick={() => onHighlight(color)}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: color,
            border: '2px solid white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            cursor: 'pointer'
          }}
          aria-label={`Highlight with color ${color}`}
        />
      ))}
      <button 
        onClick={onClose}
        className="p-1 hover:bg-gray-100 rounded ml-2"
        aria-label="Close highlight menu"
      >
        <X size={14} />
      </button>
    </div>
  );
};


interface MessageRendererProps {
  message: Message & { threadId: string };
  highlights: Highlight[];
  onHighlightCreate: (highlight: CreateHighlightData) => void;
}

export const MessageRenderer: React.FC<MessageRendererProps> = ({
  message,
  highlights,
  onHighlightCreate,
}) => {
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  
  const getSelectionInfo = useCallback((): SelectionInfo | null => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !messageRef.current) return null;
    
    try {
      const range = sel.getRangeAt(0);
      if (!messageRef.current.contains(range.commonAncestorContainer)) {
        return null;
      }
      
      const offsets = calculateNormalizedOffsets(messageRef.current, sel);
      if (!offsets) return null;
      
      return {
        text: offsets.text,
        start: offsets.start,
        end: offsets.end,
        messageId: message.id,
        rect: range.getBoundingClientRect()
      };
      
    } catch (error) {
      console.warn('Selection failed:', error);
      return null;
    }
  }, [message.id]);
  
  const handleMouseUp = useCallback(() => {
    setTimeout(() => {
      const selectionInfo = getSelectionInfo();
      setSelection(selectionInfo);
    }, 10);
  }, [getSelectionInfo]);
  
  const handleHighlight = useCallback((color: string) => {
    if (!selection) return;
    
    onHighlightCreate({
      messageId: message.id,
      text: selection.text,
      start: selection.start,
      end: selection.end,
      color: color,
    });
    
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, [selection, onHighlightCreate, message.id]);
  
  useEffect(() => {
    if (messageRef.current) {
        applyNormalizedHighlights(messageRef.current, highlights.filter(h => h.messageId === message.id));
    }
  }, [highlights, message.id, message.text]);
  
  return (
    <div className="message-wrapper">
      <div 
        ref={messageRef}
        className="message-content"
        data-message-id={message.id}
        onMouseUp={handleMouseUp}
        style={{ userSelect: 'text' }}
      >
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          className="prose prose-sm max-w-none dark:prose-invert"
        >
          {message.text}
        </ReactMarkdown>
      </div>
      
      {selection && (
        <HighlightMenu 
          selection={selection}
          onHighlight={handleHighlight}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  );
};
