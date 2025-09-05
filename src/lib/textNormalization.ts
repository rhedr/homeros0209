export const normalizeWhitespace = (text: string): string => {
  if (!text) return '';
  // Replace any sequence of whitespace characters (including newlines) with a single space, then trim.
  return text.replace(/\s+/g, ' ').trim();
};

interface TextNodeInfo {
  node: Text;
  normalizedText: string;
  rawStart: number;
  rawEnd: number;
  normalizedStart: number;
  normalizedEnd: number;
}

export const buildTextNodeMap = (container: HTMLElement): TextNodeInfo[] => {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    (node) => {
      const text = (node as Text).textContent || '';
      // Only include text nodes that have meaningful content
      return text.trim().length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  );
  
  const textNodes: TextNodeInfo[] = [];
  let normalizedPos = 0;
  let rawPos = 0;
  let textNode;
  
  while ((textNode = walker.nextNode() as Text)) {
    const rawText = textNode.textContent || '';
    const normalizedText = normalizeWhitespace(rawText);
    
    if (normalizedText.length > 0) {
      // Add space before this node if it's not the first one
      if (textNodes.length > 0) {
        normalizedPos += 1;
      }
      
      textNodes.push({
        node: textNode,
        normalizedText,
        rawStart: rawPos,
        rawEnd: rawPos + rawText.length,
        normalizedStart: normalizedPos,
        normalizedEnd: normalizedPos + normalizedText.length
      });
      
      normalizedPos += normalizedText.length;
    }
    
    rawPos += rawText.length;
  }
  
  return textNodes;
};

// Simpler approach: just get the text content and normalize it
export const getFullNormalizedText = (container: HTMLElement): string => {
  // Get all text content from the container
  const fullRawText = container.textContent || '';
  const normalizedText = normalizeWhitespace(fullRawText);
  
  console.log('getFullNormalizedText (simple approach):', {
    rawLength: fullRawText.length,
    normalizedLength: normalizedText.length,
    preview: normalizedText.substring(0, 100) + (normalizedText.length > 100 ? '...' : '')
  });
  
  return normalizedText;
};

export const calculateNormalizedOffsets = (
  container: HTMLElement,
  selection: Selection
): { start: number; end: number; text: string } | null => {
  if (!selection.rangeCount) return null;
  const range = selection.getRangeAt(0);

  // Get the selected text and normalize it
  const rawSelectedText = range.toString();
  const normalizedSelectedText = normalizeWhitespace(rawSelectedText);
  
  // If the selection is only whitespace or too short, ignore it
  if (!normalizedSelectedText || normalizedSelectedText.length < 1) {
    return null;
  }
  
  try {
    // Use simple search approach: get full normalized text and find the selection within it
    const fullNormalizedText = getFullNormalizedText(container);
    
    // Find the selected text in the normalized full text
    const searchIndex = fullNormalizedText.indexOf(normalizedSelectedText);
    if (searchIndex === -1) {
      console.warn('Could not find selected text in normalized content');
      return null;
    }
    
    // If there are multiple occurrences, try to find the right one by using position hints
    let bestIndex = searchIndex;
    const allIndices = [];
    let currentIndex = fullNormalizedText.indexOf(normalizedSelectedText, 0);
    while (currentIndex !== -1) {
      allIndices.push(currentIndex);
      currentIndex = fullNormalizedText.indexOf(normalizedSelectedText, currentIndex + 1);
    }
    
    // If multiple matches, try to pick the best one based on selection position
    if (allIndices.length > 1) {
      try {
        // Get approximate position by analyzing range position
        const preRange = document.createRange();
        preRange.selectNodeContents(container);
        preRange.setEnd(range.startContainer, range.startOffset);
        const preText = preRange.toString();
        const normalizedPreText = normalizeWhitespace(preText);
        const approximateStart = normalizedPreText.length;
        
        // Find the closest match to our approximate position
        let minDistance = Infinity;
        for (const index of allIndices) {
          const distance = Math.abs(index - approximateStart);
          if (distance < minDistance) {
            minDistance = distance;
            bestIndex = index;
          }
        }
      } catch (e) {
        // If range analysis fails, use the first match
        bestIndex = searchIndex;
      }
    }
    
    console.log('Selection offset calculation successful:', {
      selectedText: normalizedSelectedText,
      start: bestIndex,
      end: bestIndex + normalizedSelectedText.length,
      multipleMatches: allIndices.length > 1
    });
    
    return {
      start: bestIndex,
      end: bestIndex + normalizedSelectedText.length,
      text: normalizedSelectedText
    };
  } catch (error) {
    console.warn('Error calculating normalized offsets:', error);
    return null;
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
    
    if (normalizedPos === normalizedOffset) {
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

export const findTextNodeAtNormalizedOffset = (
  textNodes: TextNodeInfo[],
  normalizedOffset: number
): { nodeInfo: TextNodeInfo; offsetInNode: number } | null => {
  let currentPos = 0;
  
  for (let i = 0; i < textNodes.length; i++) {
    const nodeInfo = textNodes[i];
    const nodeStart = currentPos;
    const nodeEnd = currentPos + nodeInfo.normalizedText.length;
    
    if (normalizedOffset >= nodeStart && normalizedOffset <= nodeEnd) {
      const offsetInNormalizedText = normalizedOffset - nodeStart;
      const offsetInRawText = mapNormalizedOffsetToRaw(
        nodeInfo.node.textContent!,
        offsetInNormalizedText
      );
      return { nodeInfo, offsetInNode: offsetInRawText };
    }
    
    currentPos = nodeEnd;
    if (i < textNodes.length - 1) {
      currentPos += 1; // Add space between nodes
    }
  }
  return null;
};