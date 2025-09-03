import { normalizeWhitespace, buildTextNodeMap, getFullNormalizedText } from "./textNormalization";

export interface Highlight {
  id: string;
  messageId: string;
  text: string;
  start: number;
  end: number;
  color?: string;
}

const highlightTextNode = (
  textNode: Text,
  startOffset: number,
  endOffset: number,
  highlight: Highlight
) => {
  const parent = textNode.parentNode;
  if (!parent) return;

  try {
    // Ensure offsets are within bounds
    const maxOffset = textNode.textContent?.length || 0;
    const safeStartOffset = Math.max(0, Math.min(startOffset, maxOffset));
    const safeEndOffset = Math.max(safeStartOffset, Math.min(endOffset, maxOffset));
    
    if (safeStartOffset >= safeEndOffset) return;

    // Check if we're inside a list item
    const listItem = textNode.parentElement?.closest('li');
    const isInList = !!listItem;

    const range = document.createRange();
    range.setStart(textNode, safeStartOffset);
    range.setEnd(textNode, safeEndOffset);
    
    const mark = document.createElement('mark');
    mark.setAttribute('data-highlight-id', highlight.id);
    if (highlight.color) {
        mark.style.backgroundColor = highlight.color;
    }
    
    // Better styling for list items and inline elements
    mark.style.padding = '1px 2px';
    mark.style.borderRadius = '2px';
    mark.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
    mark.style.display = 'inline';
    mark.style.position = 'static';
    mark.style.zIndex = 'auto';
    mark.style.lineHeight = 'inherit';
    mark.style.verticalAlign = 'baseline';
    
    // Special handling for list items
    if (isInList) {
      mark.style.display = 'inline';
      mark.style.margin = '0';
      mark.style.padding = '1px 2px';
      // Make sure it doesn't interfere with list item styling
      mark.style.listStyle = 'none';
      mark.style.position = 'static';
    }
    
    // Check if we can safely surround the contents
    const rangeContents = range.extractContents();
    mark.appendChild(rangeContents);
    range.insertNode(mark);

  } catch (e) {
    console.error("Could not apply highlight for range:", highlight, e);
    
    // Fallback: try splitting the text node manually
    try {
      const textContent = textNode.textContent || '';
      const beforeText = textContent.substring(0, startOffset);
      const highlightText = textContent.substring(startOffset, endOffset);
      const afterText = textContent.substring(endOffset);
      
      const mark = document.createElement('mark');
      mark.setAttribute('data-highlight-id', highlight.id);
      if (highlight.color) {
        mark.style.backgroundColor = highlight.color;
      }
      
      // Apply same styling as main method
      mark.style.padding = '1px 2px';
      mark.style.borderRadius = '2px';
      mark.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
      mark.style.display = 'inline';
      mark.style.position = 'static';
      mark.style.zIndex = 'auto';
      mark.style.lineHeight = 'inherit';
      mark.style.verticalAlign = 'baseline';
      
      mark.textContent = highlightText;
      
      const parent = textNode.parentNode;
      if (parent && highlightText.length > 0) {
        const fragment = document.createDocumentFragment();
        if (beforeText) fragment.appendChild(document.createTextNode(beforeText));
        fragment.appendChild(mark);
        if (afterText) fragment.appendChild(document.createTextNode(afterText));
        
        parent.replaceChild(fragment, textNode);
      }
    } catch (fallbackError) {
      console.error("Fallback highlighting also failed:", fallbackError);
    }
  }
};

const highlightNormalizedRange = (
  container: HTMLElement,
  highlight: Highlight
) => {
  // Validate highlight against actual text content using simple approach
  const fullText = getFullNormalizedText(container);
  const expectedText = fullText.substring(highlight.start, highlight.end);
  
  console.log('Highlight validation (simple):', {
    highlightText: highlight.text,
    expectedText: expectedText,
    start: highlight.start,
    end: highlight.end,
    fullTextLength: fullText.length,
    match: normalizeWhitespace(expectedText) === normalizeWhitespace(highlight.text)
  });
  
  if (normalizeWhitespace(expectedText) !== normalizeWhitespace(highlight.text)) {
    console.warn('Highlight text mismatch - trying search-based approach');
    
    // Try to find the text using search
    const searchIndex = fullText.indexOf(highlight.text);
    if (searchIndex !== -1) {
      console.log('Found highlight text at different position:', searchIndex);
      // Update the highlight position and try again
      highlight.start = searchIndex;
      highlight.end = searchIndex + highlight.text.length;
    } else {
      console.warn('Could not find highlight text anywhere in content');
      return;
    }
  }
  
  // Use a much simpler approach: create ranges that span the exact text
  try {
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let currentPos = 0;
    let textNode;
    const fullRawText = container.textContent || '';
    
    // Find where our highlight should start and end in the raw text
    let rawHighlightStart = -1;
    let rawHighlightEnd = -1;
    
    // Map normalized positions to raw positions by walking through the text
    let normalizedPos = 0;
    const normalizedFullText = normalizeWhitespace(fullRawText);
    
    for (let i = 0; i < fullRawText.length; i++) {
      // Check if we've reached the start of our highlight
      if (normalizedPos === highlight.start && rawHighlightStart === -1) {
        rawHighlightStart = i;
      }
      
      // Check if we've reached the end of our highlight
      if (normalizedPos === highlight.end && rawHighlightEnd === -1) {
        rawHighlightEnd = i;
        break;
      }
      
      // Advance normalized position for non-whitespace or single whitespace
      const char = fullRawText[i];
      const isWhitespace = /\s/.test(char);
      const prevChar = i > 0 ? fullRawText[i - 1] : '';
      const prevIsWhitespace = /\s/.test(prevChar);
      
      if (!isWhitespace || !prevIsWhitespace) {
        normalizedPos++;
      }
    }
    
    if (rawHighlightStart === -1 || rawHighlightEnd === -1) {
      console.warn('Could not map highlight positions to raw text');
      return;
    }
    
    // Now find the text nodes that contain these positions
    currentPos = 0;
    while ((textNode = walker.nextNode() as Text)) {
      const nodeText = textNode.textContent || '';
      const nodeStart = currentPos;
      const nodeEnd = currentPos + nodeText.length;
      
      // Check if this node intersects with our highlight range
      if (nodeStart < rawHighlightEnd && nodeEnd > rawHighlightStart) {
        const highlightStartInNode = Math.max(0, rawHighlightStart - nodeStart);
        const highlightEndInNode = Math.min(nodeText.length, rawHighlightEnd - nodeStart);
        
        if (highlightStartInNode < highlightEndInNode) {
          highlightTextNode(textNode, highlightStartInNode, highlightEndInNode, highlight);
        }
      }
      
      currentPos = nodeEnd;
    }
  } catch (error) {
    console.error('Error in simple highlight application:', error);
  }
};

const mapNormalizedOffsetToRaw = (
  rawText: string,
  normalizedOffset: number
): number => {
  if (normalizedOffset <= 0) return 0;
  
  let normalizedPos = 0;
  let rawPos = 0;
  let wasWhitespace = false;
  
  for (let i = 0; i < rawText.length; i++) {
    const char = rawText[i];
    const isWhitespace = /\s/.test(char);
    
    if (normalizedPos >= normalizedOffset) {
      return rawPos;
    }
    
    // Advance normalized position for non-whitespace or first whitespace in sequence
    if (!isWhitespace) {
      normalizedPos++;
      wasWhitespace = false;
    } else if (!wasWhitespace) {
      normalizedPos++;
      wasWhitespace = true;
    }
    
    rawPos = i + 1;
  }
  
  return rawPos;
};

// Ensure highlight styles are injected
const ensureHighlightStyles = () => {
  if (document.getElementById('homeros-highlight-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'homeros-highlight-styles';
  style.textContent = `
    .prose mark[data-highlight-id] {
      display: inline !important;
      position: static !important;
      margin: 0 !important;
      line-height: inherit !important;
      vertical-align: baseline !important;
    }
    
    .prose li mark[data-highlight-id] {
      display: inline !important;
      list-style: none !important;
    }
    
    /* Ensure bullets are still visible */
    .prose ul li mark[data-highlight-id]:first-child {
      margin-left: 0 !important;
    }
  `;
  
  document.head.appendChild(style);
};

export const applyNormalizedHighlights = (
  container: HTMLElement, 
  highlights: Highlight[]
) => {
  console.log('applyNormalizedHighlights called with:', highlights.length, 'highlights');
  
  // Ensure our styles are loaded
  ensureHighlightStyles();
  
  // Remove existing highlights first
  const existingHighlights = container.querySelectorAll('mark[data-highlight-id]');
  console.log('Removing', existingHighlights.length, 'existing highlights');
  existingHighlights.forEach(mark => {
    const parent = mark.parentNode;
    if (parent && mark.textContent) {
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
    }
  });
  
  // Normalize the text nodes after removing highlights
  container.normalize();

  if (!highlights || highlights.length === 0) {
    console.log('No highlights to apply');
    return;
  }

  // Sort highlights by start position (descending) to avoid offset issues when applying
  const sortedHighlights = [...highlights]
    .filter(h => h.start < h.end && h.text.length > 0)
    .sort((a, b) => b.start - a.start);

  console.log('Applying', sortedHighlights.length, 'sorted highlights');

  // Apply each highlight
  for (const highlight of sortedHighlights) {
    try {
      console.log('Applying highlight:', highlight);
      highlightNormalizedRange(container, highlight);
    } catch (error) {
      console.error('Failed to apply highlight:', highlight, error);
    }
  }
};

export const clearHighlights = (container: HTMLElement) => {
  const existingHighlights = container.querySelectorAll('mark[data-highlight-id]');
  existingHighlights.forEach(mark => {
    const parent = mark.parentNode;
    if (parent && mark.textContent) {
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
    }
  });
  container.normalize();
};

export const validateHighlight = (highlight: Highlight, container: HTMLElement): boolean => {
  try {
    const textNodes = buildTextNodeMap(container);
    const fullText = textNodes.map(node => node.normalizedText).join(' ');
    
    if (highlight.start < 0 || highlight.end > fullText.length || highlight.start >= highlight.end) {
      return false;
    }
    
    const expectedText = fullText.substring(highlight.start, highlight.end);
    return normalizeWhitespace(expectedText) === normalizeWhitespace(highlight.text);
  } catch (error) {
    console.error('Error validating highlight:', error);
    return false;
  }
};