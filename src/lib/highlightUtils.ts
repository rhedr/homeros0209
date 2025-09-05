import { normalizeWhitespace, getFullNormalizedText, buildTextNodeMap } from "./textNormalization";

export interface Highlight {
  id: string;
  messageId: string;
  text: string;
  start: number;
  end: number;
  color?: string;
  groupId?: string;
}

/**
 * Creates a highlight mark element with proper styling
 */
const createHighlightMark = (highlight: Highlight, content: string): HTMLElement => {
  const mark = document.createElement('mark');
  mark.setAttribute('data-highlight-id', highlight.id);
  mark.textContent = content;
  
  // Apply color if specified
  if (highlight.color) {
    mark.style.backgroundColor = highlight.color;
  }
  
  // Apply consistent styling
  mark.style.padding = '1px 2px';
  mark.style.borderRadius = '2px';
  mark.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
  mark.style.display = 'inline';
  mark.style.position = 'static';
  mark.style.lineHeight = 'inherit';
  mark.style.verticalAlign = 'baseline';
  mark.style.margin = '0';
  
  return mark;
};

/**
 * Finds all text nodes in a container
 */
const getAllTextNodes = (container: HTMLElement): Text[] => {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node: Text) => {
        // Only accept non-empty text nodes
        return node.textContent && node.textContent.trim().length > 0 
          ? NodeFilter.FILTER_ACCEPT 
          : NodeFilter.FILTER_REJECT;
      }
    }
  );
  
  let node: Text | null;
  while ((node = walker.nextNode() as Text)) {
    textNodes.push(node);
  }
  
  return textNodes;
};

/**
 * Applies a single highlight to a text node using simple text replacement
 */
const highlightInTextNode = (textNode: Text, highlightText: string, highlight: Highlight): boolean => {
  const nodeText = textNode.textContent || '';
  const normalizedNodeText = normalizeWhitespace(nodeText);
  const normalizedHighlightText = normalizeWhitespace(highlightText);
  
  // Find the highlight text in this node
  const index = normalizedNodeText.indexOf(normalizedHighlightText);
  if (index === -1) {
    return false;
  }
  
  try {
    const parent = textNode.parentNode;
    if (!parent) return false;
    
    // Calculate positions in the original text
    let rawStartIndex = 0;
    let rawEndIndex = nodeText.length;
    
    // Map normalized positions back to raw positions
    let normalizedPos = 0;
    let foundStart = false;
    let foundEnd = false;
    
    for (let i = 0; i < nodeText.length && (!foundStart || !foundEnd); i++) {
      const char = nodeText[i];
      const isWhitespace = /\s/.test(char);
      const prevChar = i > 0 ? nodeText[i - 1] : '';
      const prevIsWhitespace = /\s/.test(prevChar);
      
      // Check if we've reached the start position
      if (!foundStart && normalizedPos === index) {
        rawStartIndex = i;
        foundStart = true;
      }
      
      // Check if we've reached the end position
      if (!foundEnd && normalizedPos === index + normalizedHighlightText.length) {
        rawEndIndex = i;
        foundEnd = true;
      }
      
      // Advance normalized position (whitespace normalization rule)
      if (!isWhitespace || (isWhitespace && !prevIsWhitespace)) {
        normalizedPos++;
      }
    }
    
    // Handle case where end wasn't found (highlight goes to end of node)
    if (!foundEnd && normalizedPos === index + normalizedHighlightText.length) {
      rawEndIndex = nodeText.length;
    }
    
    // Extract the parts
    const beforeText = nodeText.substring(0, rawStartIndex);
    const highlightedText = nodeText.substring(rawStartIndex, rawEndIndex);
    const afterText = nodeText.substring(rawEndIndex);
    
    // Verify we got the right text (allow for minor whitespace differences)
    const normalizedFound = normalizeWhitespace(highlightedText);
    if (normalizedFound !== normalizedHighlightText) {
      // Try fuzzy matching for boundary issues
      const similarity = calculateTextSimilarity(normalizedFound, normalizedHighlightText);
      if (similarity < 0.85) { // 85% similarity threshold for single nodes
        console.warn('Text mismatch in highlighting:', {
          expected: normalizedHighlightText,
          found: normalizedFound,
          rawFound: highlightedText,
          similarity: similarity
        });
        return false;
      } else {
        console.log('Text fuzzy match accepted in single node:', {
          expected: normalizedHighlightText.substring(0, 30) + '...',
          found: normalizedFound.substring(0, 30) + '...',
          similarity: similarity
        });
      }
    }
    
    // Create the replacement fragment
    const fragment = document.createDocumentFragment();
    
    // Add before text if it exists
    if (beforeText) {
      fragment.appendChild(document.createTextNode(beforeText));
    }
    
    // Add the highlight
    const mark = createHighlightMark(highlight, highlightedText);
    fragment.appendChild(mark);
    
    // Add after text if it exists
    if (afterText) {
      fragment.appendChild(document.createTextNode(afterText));
    }
    
    // Replace the original text node
    parent.replaceChild(fragment, textNode);
    
    return true;
  } catch (error) {
    console.error('Error applying highlight to text node:', error);
    return false;
  }
};

/**
 * Creates a range that spans the target text across multiple text nodes
 */
const createCrossNodeRange = (container: HTMLElement, targetText: string): Range | null => {
  const fullText = getFullNormalizedText(container);
  const targetNormalized = normalizeWhitespace(targetText);
  
  // Find the position of the target text in the full normalized text
  const startPos = fullText.indexOf(targetNormalized);
  if (startPos === -1) {
    return null;
  }
  
  const endPos = startPos + targetNormalized.length;
  
  // Walk through all text nodes to find the range boundaries
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node: Text) => {
        return node.textContent && node.textContent.trim().length > 0 
          ? NodeFilter.FILTER_ACCEPT 
          : NodeFilter.FILTER_REJECT;
      }
    }
  );
  
  let currentNormalizedPos = 0;
  let startNode: Text | null = null;
  let startOffset = 0;
  let endNode: Text | null = null;
  let endOffset = 0;
  let foundStart = false;
  let foundEnd = false;
  
  let node: Text | null;
  while ((node = walker.nextNode() as Text) && (!foundStart || !foundEnd)) {
    const nodeText = node.textContent || '';
    const normalizedNodeText = normalizeWhitespace(nodeText);
    
    // Add space between nodes if not the first node
    if (currentNormalizedPos > 0 && normalizedNodeText.length > 0) {
      // Check if we hit start/end positions at space boundaries
      if (!foundStart && currentNormalizedPos === startPos) {
        startNode = node;
        startOffset = 0;
        foundStart = true;
      }
      if (!foundEnd && currentNormalizedPos === endPos) {
        endNode = node;
        endOffset = 0;
        foundEnd = true;
      }
      currentNormalizedPos += 1; // Add space
    }
    
    const nodeStart = currentNormalizedPos;
    const nodeEnd = currentNormalizedPos + normalizedNodeText.length;
    
    // Check if start position is in this node
    if (!foundStart && startPos >= nodeStart && startPos < nodeEnd) {
      startNode = node;
      // Map back to raw position
      const normalizedOffset = startPos - nodeStart;
      startOffset = mapNormalizedOffsetToRaw(nodeText, normalizedOffset);
      foundStart = true;
    }
    
    // Check if end position is in this node
    if (!foundEnd && endPos >= nodeStart && endPos <= nodeEnd) {
      endNode = node;
      // Map back to raw position
      const normalizedOffset = endPos - nodeStart;
      endOffset = mapNormalizedOffsetToRaw(nodeText, normalizedOffset);
      foundEnd = true;
    }
    
    currentNormalizedPos = nodeEnd;
  }
  
  if (!startNode || !endNode) {
    return null;
  }
  
  try {
    const range = document.createRange();
    range.setStart(startNode, Math.min(startOffset, startNode.textContent?.length || 0));
    range.setEnd(endNode, Math.min(endOffset, endNode.textContent?.length || 0));
    
    // Verify the range contains the expected text (with fuzzy matching for boundaries)
    const rangeText = range.toString();
    const normalizedRangeText = normalizeWhitespace(rangeText);
    
    // Try exact match first
    if (normalizedRangeText === targetNormalized) {
      return range;
    }
    
    // Try fuzzy matching - allow for small differences at boundaries
    const similarity = calculateTextSimilarity(normalizedRangeText, targetNormalized);
    if (similarity > 0.9) { // 90% similarity threshold
      console.log('Range text fuzzy match accepted:', {
        expected: targetNormalized.substring(0, 50) + '...',
        found: normalizedRangeText.substring(0, 50) + '...',
        similarity: similarity
      });
      return range;
    }
    
    console.warn('Range text mismatch:', {
      expected: targetNormalized,
      found: normalizedRangeText,
      rawFound: rangeText,
      similarity: similarity
    });
    return null;
  } catch (error) {
    console.error('Error creating cross-node range:', error);
    return null;
  }
};

/**
 * Calculates text similarity between two strings using Levenshtein distance
 */
const calculateTextSimilarity = (str1: string, str2: string): number => {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  const matrix: number[][] = [];
  
  // Initialize the matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const maxLength = Math.max(len1, len2);
  const distance = matrix[len1][len2];
  return (maxLength - distance) / maxLength;
};

/**
 * Maps normalized offset to raw offset in text
 */
const mapNormalizedOffsetToRaw = (rawText: string, normalizedOffset: number): number => {
  if (normalizedOffset <= 0) return 0;
  
  let normalizedPos = 0;
  let rawPos = 0;
  
  for (let i = 0; i < rawText.length; i++) {
    if (normalizedPos >= normalizedOffset) {
      return rawPos;
    }
    
    const char = rawText[i];
    const isWhitespace = /\s/.test(char);
    const prevChar = i > 0 ? rawText[i - 1] : '';
    const prevIsWhitespace = /\s/.test(prevChar);
    
    // Advance normalized position (whitespace normalization rule)
    if (!isWhitespace || (isWhitespace && !prevIsWhitespace)) {
      normalizedPos++;
    }
    
    rawPos = i + 1;
  }
  
  return rawPos;
};

/**
 * Applies a single highlight to a container using a robust search approach
 */
const applyHighlight = (container: HTMLElement, highlight: Highlight): boolean => {
  // First, try strict application by normalized offsets for complete coverage
  const byOffsetsFirst = (() => {
    try {
      const start = Math.min(highlight.start, highlight.end);
      const end = Math.max(highlight.start, highlight.end);
      if (isNaN(start) || isNaN(end) || end <= start) return false;

      const textNodes = buildTextNodeMap(container);
      let applied = false;
      for (const info of textNodes) {
        const nodeStart = info.normalizedStart;
        const nodeEnd = info.normalizedEnd;
        const overlapStart = Math.max(start, nodeStart);
        const overlapEnd = Math.min(end, nodeEnd);
        if (overlapStart >= overlapEnd) continue;

        const localStartNorm = overlapStart - nodeStart;
        const localEndNorm = overlapEnd - nodeStart;
        const raw = info.node.textContent || '';
        const rawStart = mapNormalizedOffsetToRaw(raw, localStartNorm);
        const rawEnd = mapNormalizedOffsetToRaw(raw, localEndNorm);

        const before = raw.slice(0, rawStart);
        const middle = raw.slice(rawStart, rawEnd);
        const after = raw.slice(rawEnd);
        const parent = info.node.parentNode;
        if (!parent) continue;
        const frag = document.createDocumentFragment();
        if (before) frag.appendChild(document.createTextNode(before));
        const mark = createHighlightMark(highlight, middle);
        frag.appendChild(mark);
        if (after) frag.appendChild(document.createTextNode(after));
        parent.replaceChild(frag, info.node);
        applied = true;
      }
      return applied;
    } catch {
      return false;
    }
  })();
  if (byOffsetsFirst) return true;

  // Get all text from the container and normalize it
  const fullText = getFullNormalizedText(container);
  const highlightText = normalizeWhitespace(highlight.text);
  
  // Verify the highlight text exists in the container
  if (!fullText.includes(highlightText)) {
    console.warn('Highlight text not found in container:', {
      highlightText,
      containerPreview: fullText.substring(0, 100)
    });
    return false;
  }
  
  // Method 1: Try to apply the highlight to individual text nodes (simple case)
  const textNodes = getAllTextNodes(container);
  
  for (const textNode of textNodes) {
    if (highlightInTextNode(textNode, highlightText, highlight)) {
      return true;
    }
  }
  
  // Method 2: If simple approach failed, try cross-node range highlighting (formatted text)
  console.log('Single node highlighting failed, trying cross-node approach for text:', highlightText.substring(0, 50) + '...');
  
  try {
    const range = createCrossNodeRange(container, highlightText);
    if (!range) {
      console.warn('Could not create cross-node range, trying DOM search approach...');
      return tryDOMSearchHighlight(container, highlightText, highlight);
    }
    
    // Use the range to create a highlight that spans multiple nodes while preserving structure
    const mark = createHighlightMark(highlight, '');
    
    // Try to surround the contents without destroying the original structure
    try {
      // Check if the range is valid and can be manipulated
      if (range.collapsed) {
        console.warn('Range is collapsed, cannot highlight');
        return false;
      }
      
      // Test if surroundContents will work by checking range boundaries and complexity
      const startContainer = range.startContainer;
      const endContainer = range.endContainer;
      let canSurround = true;
      
      // More comprehensive check for range validity
      try {
        // Test if the range can create a valid selection
        const testFragment = range.cloneContents();
        if (!testFragment || testFragment.childNodes.length === 0) {
          canSurround = false;
        }
      } catch {
        canSurround = false;
      }
      
      // Check for complex range boundaries that cause InvalidStateError
      if (startContainer !== endContainer) {
        // Cross-node selection - check if it spans incompatible elements
        const commonAncestor = range.commonAncestorContainer;
        
        // If the selection spans multiple block elements (like headers + paragraphs), 
        // surroundContents will fail
        if (commonAncestor.nodeType === Node.ELEMENT_NODE) {
          const walker = document.createTreeWalker(
            commonAncestor,
            NodeFilter.SHOW_ELEMENT,
            {
              acceptNode: (node: Element) => {
                const tagName = node.tagName?.toLowerCase();
                if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'strong', 'em'].includes(tagName || '')) {
                  return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_SKIP;
              }
            }
          );
          
          const elementsInRange: Element[] = [];
          let node: Element | null;
          while ((node = walker.nextNode() as Element)) {
            if (range.intersectsNode(node)) {
              elementsInRange.push(node);
            }
          }
          
          // If we span multiple block-level elements, don't use surroundContents
          const blockElements = elementsInRange.filter(el => 
            ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div'].includes(el.tagName?.toLowerCase() || '')
          );
          if (blockElements.length > 1) {
            canSurround = false;
          }
        }
      }
      
      // Additional safety check - if range spans elements partially, surroundContents will fail
      if (range.startOffset !== 0 && startContainer.nodeType === Node.ELEMENT_NODE) {
        canSurround = false;
      }
      if (range.endOffset !== (endContainer.textContent?.length || 0) && endContainer.nodeType === Node.ELEMENT_NODE) {
        canSurround = false;
      }
      
      if (canSurround) {
        try {
          range.surroundContents(mark);
          console.log('Successfully used surroundContents to preserve formatting');
          return true;
        } catch (surroundError) {
          console.log('SurroundContents failed despite checks:', surroundError);
          canSurround = false;
        }
      }
      
      if (!canSurround) {
        // Don't use extractContents as it destroys the original DOM structure
        // Instead, fall back to a safer clone and replace approach immediately
        throw new Error('SurroundContents not possible, using safer fallback');
      }
    } catch (error) {
      // Final fallback: Use DOM search approach that doesn't manipulate ranges
      console.log('Range operations failed, using DOM search approach:', error);
      return tryDOMSearchHighlight(container, highlightText, highlight);
    }
    
    return true;
  } catch (error) {
    console.error('Cross-node highlighting failed:', error);
    console.log('Trying DOM search approach as final fallback...');
    return tryDOMSearchHighlight(container, highlightText, highlight);
  }
};

/**
 * Final fallback: DOM search approach for highlighting formatted text
 * This method finds the text and creates individual highlights without range manipulation
 */
const tryDOMSearchHighlight = (container: HTMLElement, highlightText: string, highlight: Highlight): boolean => {
  const normalizedTarget = normalizeWhitespace(highlightText);
  
  try {
    // Create a TreeWalker to traverse all text nodes
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node: Text) => {
          return node.textContent && node.textContent.trim().length > 0 
            ? NodeFilter.FILTER_ACCEPT 
            : NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    const textParts: { node: Text; text: string; normalizedText: string }[] = [];
    let node: Text | null;
    
    // Collect all text nodes and their content
    while ((node = walker.nextNode() as Text)) {
      const text = node.textContent || '';
      textParts.push({
        node,
        text,
        normalizedText: normalizeWhitespace(text)
      });
    }
    
    console.log('DOM search: found', textParts.length, 'text nodes');
    
    // Try to find a sequence of text nodes that contains our target text
    for (let startIdx = 0; startIdx < textParts.length; startIdx++) {
      let combinedNormalized = '';
      const nodesInSequence: Text[] = [];
      
      // Build up the combined text from consecutive nodes
      for (let endIdx = startIdx; endIdx < textParts.length; endIdx++) {
        const part = textParts[endIdx];
        nodesInSequence.push(part.node);
        
        // Add proper spacing between nodes from different elements
        if (combinedNormalized.length > 0) {
          combinedNormalized += ' ';
        }
        combinedNormalized += part.normalizedText;
        
        // Check if we found our target text within this sequence
        const targetIndex = combinedNormalized.indexOf(normalizedTarget);
        if (targetIndex !== -1) {
          console.log('DOM search found target text in sequence of', nodesInSequence.length, 'nodes');
          
          // Strategy: Create individual highlights for parts of the text that appear in each node
          // This avoids breaking the DOM structure
          
          let remainingTarget = normalizedTarget;
          let currentTargetPos = 0;
          let highlightedNodes = 0;
          
          // Go through each node in the sequence and highlight the parts that match
          for (let i = 0; i < nodesInSequence.length && remainingTarget.length > 0; i++) {
            const currentNode = nodesInSequence[i];
            const nodeText = currentNode.textContent || '';
            const nodeNormalized = normalizeWhitespace(nodeText);
            
            // Find how much of the remaining target text is in this node
            let nodeTargetText = '';
            
            if (i === 0) {
              // First node: might start partway through
              const nodeStartInTarget = Math.max(0, targetIndex);
              const availableFromNode = nodeNormalized.length - (targetIndex - currentTargetPos);
              const neededFromNode = Math.min(availableFromNode, remainingTarget.length);
              
              if (neededFromNode > 0 && targetIndex < nodeNormalized.length) {
                nodeTargetText = nodeNormalized.substring(Math.max(0, targetIndex), Math.min(nodeNormalized.length, targetIndex + neededFromNode));
              }
            } else {
              // Subsequent nodes: take what we need from the beginning
              const neededFromNode = Math.min(nodeNormalized.length, remainingTarget.length);
              nodeTargetText = nodeNormalized.substring(0, neededFromNode);
            }
            
            // Try to highlight this portion in the current node
            if (nodeTargetText.length > 0 && nodeNormalized.includes(nodeTargetText)) {
              const nodeHighlight: Highlight = {
                ...highlight,
                id: `${highlight.id}-part-${i}`,
                text: nodeTargetText
              };
              
              if (highlightInTextNode(currentNode, nodeTargetText, nodeHighlight)) {
                highlightedNodes++;
                remainingTarget = remainingTarget.substring(nodeTargetText.length);
                console.log(`Successfully highlighted part ${i + 1}: "${nodeTargetText}"`);
              } else {
                console.log(`Failed to highlight part ${i + 1}: "${nodeTargetText}" in node:`, nodeNormalized);
              }
            }
            
            // Update position for next iteration
            currentTargetPos += nodeNormalized.length + (i < nodesInSequence.length - 1 ? 1 : 0); // +1 for space between nodes
          }
          
          console.log(`DOM search: highlighted ${highlightedNodes} nodes out of ${nodesInSequence.length}`);
          return highlightedNodes > 0;
        }
        
        // Stop if we've gone too far
        if (combinedNormalized.length > normalizedTarget.length * 2) {
          break;
        }
      }
    }
    
    console.warn('DOM search could not find target text:', normalizedTarget.substring(0, 50) + '...');
    return false;
  } catch (error) {
    console.error('DOM search highlighting failed:', error);
    return false;
  }
};

/**
 * Ensures highlight styles are injected into the document
 */
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
      box-sizing: border-box !important;
      word-break: normal !important;
      white-space: normal !important;
    }
    
    .prose li mark[data-highlight-id] {
      display: inline !important;
      list-style: none !important;
    }
    
    /* Ensure highlights don't break text flow */
    .prose mark[data-highlight-id]:before,
    .prose mark[data-highlight-id]:after {
      content: none !important;
    }
    
    /* Ensure proper text rendering */
    .prose mark[data-highlight-id] {
      text-decoration: none !important;
      font-style: inherit !important;
      font-weight: inherit !important;
      font-size: inherit !important;
      font-family: inherit !important;
    }
  `;
  
  document.head.appendChild(style);
};

/**
 * Removes all existing highlights from a container
 */
const clearExistingHighlights = (container: HTMLElement) => {
  const existingHighlights = container.querySelectorAll('mark[data-highlight-id]');
  
  existingHighlights.forEach(mark => {
    const parent = mark.parentNode;
    if (parent && mark.textContent) {
      // Replace the mark with its text content
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
    }
  });
  
  // Normalize the container to merge adjacent text nodes
  container.normalize();
};

/**
 * Main function to apply normalized highlights to a container
 * This is a complete rewrite with a simpler, more robust approach
 */
export const applyNormalizedHighlights = (
  container: HTMLElement, 
  highlights: Highlight[]
) => {
  console.log('applyNormalizedHighlights called with:', highlights.length, 'highlights');
  
  // Ensure our styles are loaded
  ensureHighlightStyles();
  
  // Remove existing highlights first
  clearExistingHighlights(container);
  
  if (!highlights || highlights.length === 0) {
    console.log('No highlights to apply');
    return;
  }
  
  // Filter and sort highlights by start position (descending) to avoid offset issues
  const validHighlights = highlights
    .filter(h => h.text && h.text.trim().length > 0)
    .sort((a, b) => b.start - a.start);
  
  console.log('Applying', validHighlights.length, 'valid highlights');
  
  // Apply each highlight
  let successCount = 0;
  for (const highlight of validHighlights) {
    try {
      console.log('Applying highlight:', {
        id: highlight.id,
        text: highlight.text.substring(0, 50) + (highlight.text.length > 50 ? '...' : ''),
        start: highlight.start,
        end: highlight.end
      });
      
      const success = applyHighlight(container, highlight);
      if (success) {
        successCount++;
      }
    } catch (error) {
      console.error('Failed to apply highlight:', highlight, error);
    }
  }
  
  console.log(`Successfully applied ${successCount}/${validHighlights.length} highlights`);
};

/**
 * Clears all highlights from a container
 */
export const clearHighlights = (container: HTMLElement) => {
  clearExistingHighlights(container);
};

/**
 * Validates if a highlight can be applied to a container
 */
export const validateHighlight = (highlight: Highlight, container: HTMLElement): boolean => {
  try {
    const fullText = getFullNormalizedText(container);
    const highlightText = normalizeWhitespace(highlight.text);
    
    // Check if the text exists in the container
    return fullText.includes(highlightText);
  } catch (error) {
    console.error('Error validating highlight:', error);
    return false;
  }
};