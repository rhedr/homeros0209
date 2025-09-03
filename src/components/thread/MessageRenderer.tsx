
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
    <div 
      style={style} 
      className="highlight-menu" 
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <PaintBucket size={16} className="text-gray-600" />
      {colors.map(color => (
        <button
          key={color}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onHighlight(color);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
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
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
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
  const [lastClickTime, setLastClickTime] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  
  const getSelectionInfo = useCallback((): SelectionInfo | null => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !messageRef.current) return null;
    
    try {
      const range = sel.getRangeAt(0);
      
      // Check if selection is within our message container
      // Use a more robust check that handles cross-element selections
      const startInMessage = messageRef.current.contains(range.startContainer) || 
                           messageRef.current === range.startContainer;
      const endInMessage = messageRef.current.contains(range.endContainer) || 
                         messageRef.current === range.endContainer;
      
      if (!startInMessage || !endInMessage) {
        return null;
      }
      
      const offsets = calculateNormalizedOffsets(messageRef.current, sel);
      if (!offsets) {
        return null;
      }
      
      // Debug: Compare selected text with what we'll store
      console.log('Selection comparison:', {
        rawSelected: sel.toString(),
        normalizedSelected: offsets.text,
        calculatedOffsets: { start: offsets.start, end: offsets.end },
        messageId: message.id
      });
      
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
  
  const handleMouseDown = useCallback((event: MouseEvent) => {
    // Track click timing to detect triple-clicks
    const currentTime = Date.now();
    const timeDiff = currentTime - lastClickTime;
    
    if (timeDiff < 500) { // Within 500ms, likely a multi-click
      setClickCount(prev => prev + 1);
    } else {
      setClickCount(1);
    }
    
    setLastClickTime(currentTime);
  }, [lastClickTime]);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    // Only process selection if we're not clicking on the highlight menu
    const target = event.target as HTMLElement;
    if (target.closest('.highlight-menu')) {
      return;
    }
    
    // Use a timeout to ensure selection is stable
    setTimeout(() => {
      const sel = window.getSelection();
      
      // Only show menu if there's a non-collapsed selection
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setSelection(null);
        return;
      }
      
      // Don't show menu for triple-clicks (clickCount will be 3)
      if (clickCount >= 3) {
        console.log('Triple-click detected, not showing highlight menu');
        setSelection(null);
        return;
      }
      
      const selectionInfo = getSelectionInfo();
      setSelection(selectionInfo);
    }, 10);
  }, [getSelectionInfo, clickCount]);
  
  
  // Clear selection when clicking outside the message
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Don't clear if clicking on the highlight menu
      if (target.closest('.highlight-menu')) {
        return;
      }
      
      if (messageRef.current && !messageRef.current.contains(event.target as Node)) {
        setSelection(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleHighlight = useCallback((color: string) => {
    if (!selection) return;
    
    console.log('Creating highlight:', {
      messageId: message.id,
      text: selection.text,
      start: selection.start,
      end: selection.end,
      color: color,
    });
    
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
        const messageHighlights = highlights.filter(h => h.messageId === message.id);
        console.log('Applying highlights to message:', message.id, messageHighlights);
        applyNormalizedHighlights(messageRef.current, messageHighlights);
    }
  }, [highlights, message.id, message.text]);
  
  return (
    <div className="message-wrapper">
      <div 
        ref={messageRef}
        className="message-content"
        data-message-id={message.id}
        onMouseDown={handleMouseDown}
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
