
import { normalizeWhitespace } from "./textNormalization";

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
    const range = document.createRange();
    range.setStart(textNode, startOffset);
    range.setEnd(textNode, endOffset);
    
    const mark = document.createElement('mark');
    mark.setAttribute('data-highlight-id', highlight.id);
    if (highlight.color) {
        mark.style.backgroundColor = highlight.color;
    }
    mark.style.padding = '1px 2px';
    mark.style.borderRadius = '2px';
    
    // This is the crucial part that can fail if the range is invalid.
    range.surroundContents(mark);

  } catch (e) {
    // This can happen if the range is invalid or crosses boundaries it can't handle.
    console.error("Could not apply highlight for range:", highlight, e);
  }
};


const highlightNormalizedRange = (
  container: HTMLElement,
  highlight: Highlight
) => {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let normalizedPos = 0;
  let textNode;
  
  while ((textNode = walker.nextNode() as Text)) {
    const rawText = textNode.textContent || '';
    if (rawText.trim() === '') continue;

    const normalizedText = normalizeWhitespace(rawText);
    const normalizedStart = normalizedPos;
    const normalizedEnd = normalizedPos + normalizedText.length;
    
    if (normalizedStart < highlight.end && normalizedEnd > highlight.start) {
      const highlightStartInNormalized = Math.max(0, highlight.start - normalizedStart);
      const highlightEndInNormalized = Math.min(normalizedText.length, highlight.end - normalizedStart);
      
      const rawMapping = mapNormalizedToRaw(rawText, highlightStartInNormalized, highlightEndInNormalized);
      
      if (rawMapping && rawMapping.start < rawMapping.end) {
        highlightTextNode(textNode, rawMapping.start, rawMapping.end, highlight);
      }
    }
    
    normalizedPos = normalizedEnd + (normalizedText.length > 0 ? 1 : 0); // Add 1 for the space between nodes
  }
};

const mapNormalizedToRaw = (
  rawText: string,
  normalizedStart: number,
  normalizedEnd: number
): { start: number; end: number } | null => {
  let normalizedPos = 0;
  let rawStart = -1;
  
  for (let i = 0; i < rawText.length; i++) {
    const char = rawText[i];
    const isWhitespace = /\s/.test(char);

    if (!isWhitespace || (i > 0 && !/\s/.test(rawText[i-1]))) {
        if (normalizedPos === normalizedStart) {
            rawStart = i;
            break;
        }
        normalizedPos++;
    }
  }

  if(rawStart === -1) return null;

  let rawEnd = rawStart;
  let len = normalizedEnd - normalizedStart;

  for (let i = rawStart; i < rawText.length && len > 0; i++) {
      const char = rawText[i];
      const isWhitespace = /\s/.test(char);
      if(!isWhitespace || (i > 0 && !/\s/.test(rawText[i-1]))) {
          len--;
      }
      rawEnd = i + 1;
  }
  
  return { start: rawStart, end: rawEnd };
};

export const applyNormalizedHighlights = (
  container: HTMLElement, 
  highlights: Highlight[]
) => {
  const existingHighlights = container.querySelectorAll('mark[data-highlight-id]');
  existingHighlights.forEach(mark => {
    const parent = mark.parentNode;
    if (parent && mark.textContent) {
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize();
    }
  });

  if (!highlights || highlights.length === 0) return;

  const sortedHighlights = [...highlights].sort((a, b) => b.start - a.start);

  sortedHighlights.forEach(highlight => {
      highlightNormalizedRange(container, highlight);
  });
};
