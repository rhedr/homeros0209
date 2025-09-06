export const normalizeWhitespace = (text: string): string => {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
};

export const calculateNormalizedOffsets = (
  container: HTMLElement,
  selection: Selection
): { start: number; end: number; text: string } | null => {
  if (!selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  
  const rawSelectedText = selection.toString();
  const normalizedSelectedText = normalizeWhitespace(rawSelectedText);
  
  if (!normalizedSelectedText || normalizedSelectedText.length < 1) {
    return null;
  }
  
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let normalizedFullText = '';
  let textNode;
  
  while ((textNode = walker.nextNode() as Text)) {
    const rawNodeText = textNode.textContent || '';
    if (rawNodeText.trim() !== '') {
        normalizedFullText += normalizeWhitespace(rawNodeText) + ' ';
    }
  }
  normalizedFullText = normalizedFullText.trim();
  
  const preRange = range.cloneRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);
  const normalizedStart = normalizeWhitespace(preRange.toString()).length;

  if (normalizedStart === -1) return null;
  
  const normalizedEnd = normalizedStart + normalizedSelectedText.length;
  
  return {
    start: normalizedStart,
    end: normalizedEnd,
    text: normalizedSelectedText
  };
};