
export const normalizeWhitespace = (text: string): string => {
  if (!text) return '';
  // Replace any sequence of whitespace characters (including newlines) with a single space, then trim.
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
  
  // If the selection is only whitespace or too short, ignore it.
  if (!normalizedSelectedText || normalizedSelectedText.length < 1) {
    return null;
  }
  
  // To get the correct starting position, we create a temporary range
  // from the beginning of the container to the start of the user's selection.
  const preRange = range.cloneRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);
  
  // The length of the normalized text of this pre-range is our start offset.
  // This correctly calculates the position regardless of where the selection is.
  const start = normalizeWhitespace(preRange.toString()).length;
  const end = start + normalizedSelectedText.length;
  
  return {
    start: start,
    end: end,
    text: normalizedSelectedText
  };
};
