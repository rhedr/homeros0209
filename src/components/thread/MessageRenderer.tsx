
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
type Message = {
  role: 'user' | 'ai';
  text: string;
  id: string;
};


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
  
  // Helper function to calculate text offset within container
  const calculateTextOffset = useCallback((container: HTMLElement, targetNode: Node, targetOffset: number): number => {
    try {
      const range = document.createRange();
      range.setStart(container, 0);
      range.setEnd(targetNode, targetOffset);
      const textBeforeTarget = range.toString();
      const normalizedTextBefore = textBeforeTarget.replace(/\s+/g, ' ').trim();
      
      // Handle edge case where the text starts with whitespace
      const fullText = container.textContent || '';
      const normalizedFullText = fullText.replace(/\s+/g, ' ').trim();
      
      if (normalizedTextBefore === '') return 0;
      return normalizedTextBefore.length;
    } catch (error) {
      console.error('Error calculating text offset:', error);
      return -1;
    }
  }, []);

  const handleHighlight = useCallback((color: string) => {
    if (!selection || !messageRef.current) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const userRange = sel.getRangeAt(0).cloneRange();

    // Strategy: split selection by meaningful text containers and create a
    // separate highlight for each contiguous text segment. Group them with a groupId.
    const groupId = `grp-${Date.now()}`;
    // Get potential text containers: limit to top-level blocks to avoid duplicates
    const candidates = Array.from(
      messageRef.current.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li')
    ) as HTMLElement[];
    // Keep only topmost elements (skip nested ones like strong within li)
    const allBlocks = candidates.filter(el => !candidates.some(other => other !== el && other.contains(el)));
    const blocks = allBlocks.filter(block => {
      // Only include blocks that have meaningful text content
      const blockText = block.textContent?.trim() || '';
      return blockText.length > 0;
    });
    
    console.log('🔍 Found blocks for highlighting:', blocks.map(b => ({
      tag: b.tagName,
      text: b.textContent?.substring(0, 20) + '...',
      hasFootnote: b.textContent?.includes('[^') || b.textContent?.includes(']')
    })));
    const ranges: { range: Range; text: string }[] = [];
    
    // Get full container text for offset calculations
    const containerEl = messageRef.current as HTMLElement;
    const fullContainerText = containerEl ? (containerEl.textContent || '') : '';
    const normalizedFull = fullContainerText.replace(/\s+/g, ' ').trim();
    
    blocks.forEach((block, blockIndex) => {
      // Skip blocks outside selection
      if (!userRange.intersectsNode(block)) {
        console.log(`Block ${blockIndex} (${block.tagName}): not intersected, skipping`);
        return;
      }
      
      console.log(`Block ${blockIndex} (${block.tagName}): processing...`);
      
      try {
        // Create a range for the entire block
        const blockRange = document.createRange();
        blockRange.selectNodeContents(block);
        
        // Check if the user selection actually contains this block or vice versa
        let intersectionRange: Range;
        
        // Case 1: User selection is entirely within this block
        if (userRange.compareBoundaryPoints(Range.START_TO_START, blockRange) >= 0 &&
            userRange.compareBoundaryPoints(Range.END_TO_END, blockRange) <= 0) {
          intersectionRange = userRange.cloneRange();
          console.log(`  Block ${blockIndex}: user selection is within block`);
        }
        // Case 2: Block is entirely within user selection  
        else if (blockRange.compareBoundaryPoints(Range.START_TO_START, userRange) >= 0 &&
                 blockRange.compareBoundaryPoints(Range.END_TO_END, userRange) <= 0) {
          intersectionRange = blockRange.cloneRange();
          console.log(`  Block ${blockIndex}: block is within user selection`);
        }
        // Case 3: Partial intersection - trim to overlapping content
        else {
          intersectionRange = document.createRange();
          
          // Use the later start point
          if (userRange.compareBoundaryPoints(Range.START_TO_START, blockRange) > 0) {
            intersectionRange.setStart(userRange.startContainer, userRange.startOffset);
          } else {
            intersectionRange.setStart(blockRange.startContainer, blockRange.startOffset);
          }
          
          // Use the earlier end point
          if (userRange.compareBoundaryPoints(Range.END_TO_END, blockRange) < 0) {
            intersectionRange.setEnd(userRange.endContainer, userRange.endOffset);
          } else {
            intersectionRange.setEnd(blockRange.endContainer, blockRange.endOffset);
          }
          
          console.log(`  Block ${blockIndex}: partial intersection`);
        }
        
        const rawText = intersectionRange.toString();
        const text = rawText.replace(/\s+/g, ' ').trim();
        
        console.log(`  Block ${blockIndex} text:`, JSON.stringify(text.substring(0, 50) + (text.length > 50 ? '...' : '')));
        
        // Only include ranges with meaningful content (at least 3 non-whitespace characters)
        const nonWhitespaceLength = text.replace(/\s/g, '').length;
        if (nonWhitespaceLength >= 3) {
          ranges.push({ range: intersectionRange, text });
          console.log(`  Block ${blockIndex}: added to ranges (total: ${ranges.length})`);
        } else {
          console.log(`  Block ${blockIndex}: skipping, insufficient content (${nonWhitespaceLength} chars)`);
        }
      } catch (error) {
        console.warn(`Error processing block ${blockIndex} for highlighting:`, error);
      }
    });

    // Fallback: if no block ranges found, use the full selection
    if (ranges.length === 0) {
      const fullText = userRange.toString().replace(/\s+/g, ' ').trim();
      if (fullText) {
        ranges.push({ range: userRange, text: fullText });
      }
    }

    console.log('Creating grouped highlights: count=', ranges.length);
    console.log('Group ID:', groupId);
    
    // Create highlights by locating each segment in the container's normalized text, sequentially
    const containerNormalized = (containerEl.textContent || '').replace(/\s+/g, ' ').trim();
    let searchCursor = 0;
    ranges.forEach(({ text }, index) => {
      if (!text) return;
      const normalizedText = text.replace(/\s+/g, ' ').trim();
      const foundAt = containerNormalized.indexOf(normalizedText, searchCursor);
      if (foundAt === -1) {
        console.warn('Could not locate highlight text in container:', normalizedText.substring(0, 60));
        return;
      }
      const start = foundAt;
      const end = foundAt + normalizedText.length;
      searchCursor = end + 1;
      
      const highlightData = {
        messageId: message.id,
        text: normalizedText,
        start,
        end,
        color,
        groupId,
      };
      
      console.log(`Creating highlight ${index + 1}/${ranges.length}:`, {
        text: normalizedText.substring(0, 50) + (normalizedText.length > 50 ? '...' : ''),
        start,
        end,
        groupId
      });
      
      onHighlightCreate(highlightData as any);
    });

    setSelection(null);
    sel.removeAllRanges();
  }, [selection, onHighlightCreate, message.id, calculateTextOffset]);
  
  useEffect(() => {
    if (messageRef.current) {
        const messageHighlights = highlights.filter(h => h.messageId === message.id);
        console.log('🎨 MessageRenderer useEffect triggered for message:', message.id);
        console.log('🎨 Total highlights in state:', highlights.length);
        console.log('🎨 Highlights for this message:', messageHighlights.length);
        console.log('🎨 Message highlights details:', messageHighlights.map(h => ({
          id: h.id,
          text: h.text.substring(0, 30) + '...',
          groupId: h.groupId || 'no-group'
        })));
        applyNormalizedHighlights(messageRef.current, messageHighlights);

        // Revert: remove reference placeholders; no click behavior
        const container = messageRef.current;
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = walker.nextNode())) {
          const t = n as Text;
          if (t.data) t.data = t.data.replace(/\[\[FNREF:(\d+)\]\]/g, '');
        }
    }
  }, [highlights, message.id, message.text]);
  
  return (
    <div className="message-wrapper">
      <div 
        ref={messageRef}
        className="message-content"
        data-message-id={message.id}
        onMouseDown={handleMouseDown as any}
        onMouseUp={handleMouseUp as any}
        style={{ userSelect: 'text' }}
      >
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          className="prose prose-sm max-w-none dark:prose-invert"
          components={{
            // We handle sup elements through the 'a' component customization below
            // Customize footnote reference rendering
            a: ({ href, children, ...props }) => {
              // Check if this is a footnote reference link
              if (href && href.startsWith('#user-content-fn-')) {
                return (
                  <sup 
                    className="text-primary cursor-pointer hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('📝 In-text citation clicked! href:', href);
                      console.log('📝 Event target:', e.target);
                      
                      const footnoteId = href.replace('#', '');
                      console.log('🎯 Looking for footnote with ID:', footnoteId);
                      
                      // Try multiple methods to find the footnote
                      let footnote = document.getElementById(footnoteId);
                      console.log('📍 getElementById result:', footnote);
                      
                      if (!footnote) {
                        // Try alternative selectors
                        const altSelectors = [
                          `#${footnoteId}`,
                          `[id="${footnoteId}"]`,
                          `li[id="${footnoteId}"]`
                        ];
                        
                        for (const selector of altSelectors) {
                          footnote = document.querySelector(selector);
                          console.log(`🔍 Trying selector "${selector}":`, footnote);
                          if (footnote) break;
                        }
                      }
                      
                      console.log('📍 Final footnote element:', footnote);
                      if (footnote) {
                        footnote.scrollIntoView({ 
                          behavior: 'smooth', 
                          block: 'center',
                          inline: 'nearest' 
                        });
                        // Add a brief highlight effect to the reference
                        const htmlFootnote = footnote as HTMLElement;
                        htmlFootnote.style.transition = 'background-color 0.3s ease';
                        htmlFootnote.style.backgroundColor = '#fef3c7';
                        setTimeout(() => {
                          htmlFootnote.style.backgroundColor = '';
                          setTimeout(() => {
                            htmlFootnote.style.transition = '';
                          }, 300);
                        }, 2000);
                      }
                    }}
                  >
                    <a {...props} href={href}>{children}</a>
                  </sup>
                );
              }
              // Convert placeholder [[FNREF:n]] generated in references into clickable superscripts
              if (!href && Array.isArray(children) && typeof children[0] === 'string' && /\[\[FNREF:(\d+)\]\]/.test(String(children[0]))) {
                const match = (children[0] as string).match(/\[\[FNREF:(\d+)\]\]/);
                const num = match ? match[1] : '';
                const superscriptMap: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
                const toSuperscript = (n: string) => n.split('').map(d => superscriptMap[d] || d).join('');
                return (
                  <sup
                    className="text-primary cursor-pointer hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const candidates = Array.from(document.querySelectorAll('sup')) as HTMLElement[];
                      const target = candidates.find(el => el.textContent === toSuperscript(num));
                      if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        target.style.transition = 'background-color 0.3s ease';
                        target.style.backgroundColor = '#fef3c7';
                        setTimeout(() => { target.style.backgroundColor = ''; }, 1500);
                      }
                    }}
                  >
                    {toSuperscript(num)}
                  </sup>
                );
              }
              // Check if this is a footnote return link (the arrows!)
              if (href && href.startsWith('#user-content-fnref-')) {
                console.log('🏹 Processing footnote return link:', href, 'props.className:', props.className);
                return (
                  <span 
                    className="text-xs text-muted-foreground hover:text-primary ml-2 cursor-pointer"
                    title="Return to reference in text"
                    onMouseEnter={() => {
                      console.log('🖱️ Mouse entered arrow span');
                    }}
                    onMouseDown={() => {
                      console.log('🖱️ Mouse down on arrow span');
                    }}
                    onMouseUp={() => {
                      console.log('🖱️ Mouse up on arrow span');
                    }}
                    onClick={(e) => {
                      console.log('🔙 SPAN WRAPPER CLICKED! Event:', e.type);
                      console.log('🔙 Target:', e.target);
                      console.log('🔙 CurrentTarget:', e.currentTarget);
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Extract reference id from href like #user-content-fnref-1 or #user-content-fnref-1-2
                      const refId = href.replace('#user-content-fnref-', '');
                      const baseRefNumber = refId.split('-')[0];
                      console.log('🎯 Extracted refId:', refId, 'baseRefNumber:', baseRefNumber);
                      
                      // Try multiple selectors to find the corresponding in-text citation
                      const selectors = [
                        `[href="#user-content-fn-${baseRefNumber}"]`,
                        `a[href="#user-content-fn-${baseRefNumber}"]`,
                        `sup a[href="#user-content-fn-${baseRefNumber}"]`,
                        `[id="user-content-fn-${baseRefNumber}"] a`,
                      ];
                      let citation: Element | null = null;
                      for (const selector of selectors) {
                        const candidate = document.querySelector(selector);
                        console.log(`🔍 Trying selector "${selector}":`, candidate);
                        if (candidate) { citation = candidate; break; }
                      }
                      console.log('📍 Final citation element:', citation);
                      
                      if (citation) {
                        citation.scrollIntoView({ 
                          behavior: 'smooth', 
                          block: 'center',
                          inline: 'nearest' 
                        });
                        // Add highlight effect
                        const htmlCitation = citation as HTMLElement;
                        htmlCitation.style.transition = 'background-color 0.3s ease';
                        htmlCitation.style.backgroundColor = '#fef3c7';
                        setTimeout(() => {
                          htmlCitation.style.backgroundColor = '';
                          setTimeout(() => {
                            htmlCitation.style.transition = '';
                          }, 300);
                        }, 2000);
                      }
                    }}
                  >
                    ↩
                  </span>
                );
              }
              // Regular links
              return <a {...props} href={href}>{children}</a>;
            }
          }}
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
