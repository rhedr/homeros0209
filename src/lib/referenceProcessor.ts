import { v4 as uuidv4 } from 'uuid';

export type ThreadReference = {
    id: string;
    text: string;
    messageId: string;
    number: number;
    url?: string;
    title?: string;
};

export type ProcessedMessage = {
    text: string;
    extractedReferences: ThreadReference[];
};

const FOOTNOTE_PATTERNS = [
    /\[(\d+)\]/g,
    /\[\^(\d+)\]/g,
    /\[(\d+)\]:\s*(.+?)(?=\n|$)/g,
    /References?:\s*\n((?:\d+\.\s*.+?\n)*)/gi,
    /Sources?:\s*\n((?:\d+\.\s*.+?\n)*)/gi,
];

/**
 * Validates whether a reference text is legitimate or should be filtered out
 * @param text The reference text to validate
 * @returns true if the reference is valid, false if it should be filtered
 */
function isValidReferenceText(text: string): boolean {
    if (!text || typeof text !== 'string') {
        return false;
    }

    const cleanText = text.trim();
    
    // Filter out years (any 4-digit number from 1800-2099)
    if (/^(1[89]|20)\d{2}$/.test(cleanText)) {
        console.log('❌ Filtering out year reference:', cleanText);
        return false;
    }
    
    // Filter out very short text (< 5 chars only - much more permissive)
    if (cleanText.length < 5) {
        console.log('❌ Filtering out very short reference:', cleanText);
        return false;
    }
    
    // Filter out just numbers
    if (/^\d+$/.test(cleanText)) {
        console.log('❌ Filtering out numeric reference:', cleanText);
        return false;
    }
    
    // Filter out common incomplete citation fragments
    if (/^(eds?\.?|et al\.?|vol\.?|pp?\.?|no\.?|ibid\.?|fig\.?|table\.?)$/i.test(cleanText)) {
        console.log('❌ Filtering out incomplete fragment:', cleanText);
        return false;
    }
    
    // Filter out text that's mostly punctuation or numbers
    if (/^[\d\s\.,;:\-()]+$/.test(cleanText)) {
        console.log('❌ Filtering out punctuation-heavy reference:', cleanText);
        return false;
    }
    
    // Filter out single words under 8 characters (much more permissive, allow URLs/DOIs)
    if (!/\s/.test(cleanText) && cleanText.length < 8 && !/\w+\.\w+|https?:|doi:|www\./i.test(cleanText)) {
        console.log('❌ Filtering out single word reference:', cleanText);
        return false;
    }
    
    // Require at least one alphabetic character
    if (!/[a-zA-Z]/.test(cleanText)) {
        console.log('❌ Filtering out non-alphabetic reference:', cleanText);
        return false;
    }
    
    // Must have proper structure (spaces or substantial length) - much more permissive 
    if (!cleanText.includes(' ') && cleanText.length < 10 && !/https?:|doi:|www\.|\.com|\.org|\.edu/i.test(cleanText)) {
        console.log('❌ Filtering out structurally poor reference:', cleanText);
        return false;
    }

    console.log('✅ Valid reference text:', cleanText.substring(0, 50) + (cleanText.length > 50 ? '...' : ''));
    return true;
}

export function extractReferencesFromText(
    text: string, 
    messageId: string, 
    existingReferences: ThreadReference[]
): ProcessedMessage {
    const extractedReferences: ThreadReference[] = [];
    let processedText = text;
    let nextReferenceNumber = Math.max(...existingReferences.map(r => r.number), 0) + 1;

    // Maps original number to new reference object
    const originalToNewReferenceMap = new Map<string, ThreadReference>();
    // Maps original number to new number for consistent replacement
    const numberMappings = new Map<string, number>();

    // Handle edge case: empty or whitespace-only text
    if (!text || text.trim().length === 0) {
        return {
            text: processedText,
            extractedReferences: []
        };
    }

    // More robust footnote regex that handles various formats
    const footnotePatterns = [
        /\[\^(\d+)\]/g,        // [^1]
        /\[(\d+)\]/g,          // [1]
        /\(\^(\d+)\)/g,        // (^1)
        /\((\d+)\)/g           // (1) - but be careful not to match years, etc.
    ];

    // First pass: identify all unique original reference numbers
    const originalNumbers = new Set<string>();
    
    for (const footnoteRegex of footnotePatterns) {
        let match;
        const regex = new RegExp(footnoteRegex.source, footnoteRegex.flags);
        
        while ((match = regex.exec(text)) !== null) {
            const originalNumber = parseInt(match[1]);
            
            // Skip if this looks like a year (4 digits) or other non-reference number
            if (originalNumber > 999 || originalNumber < 1) {
                continue;
            }
            
            originalNumbers.add(originalNumber.toString());
        }
    }

    // Create reference objects for each unique original number
    for (const originalNumber of originalNumbers) {
        const newReference: ThreadReference = {
            id: uuidv4(),
            text: `Reference ${originalNumber} (source not provided)`, // Better placeholder text
            messageId,
            number: nextReferenceNumber
        };
        
        originalToNewReferenceMap.set(originalNumber, newReference);
        numberMappings.set(originalNumber, nextReferenceNumber);
        extractedReferences.push(newReference);
        
        nextReferenceNumber++;
    }

    // Second pass: replace all inline citations with new numbers
    const replacements = new Map<string, string>();
    
    for (const footnoteRegex of footnotePatterns) {
        let match;
        const regex = new RegExp(footnoteRegex.source, footnoteRegex.flags);
        
        while ((match = regex.exec(text)) !== null) {
            const originalNumber = parseInt(match[1]);
            const footnoteText = match[0];
            
            // Skip if this looks like a year (4 digits) or other non-reference number
            if (originalNumber > 999 || originalNumber < 1) {
                continue;
            }
            
            // Skip if we already processed this exact footnote text
            if (replacements.has(footnoteText)) {
                continue;
            }
            
            const newNumber = numberMappings.get(originalNumber.toString());
            if (newNumber) {
                replacements.set(footnoteText, `[^${newNumber}]`);
            }
        }
    }
    
    // Apply all replacements in a single pass (no anchor injection)
    for (const [original, replacement] of replacements) {
        processedText = processedText.replaceAll(original, replacement);
    }

    console.log('🔍 Looking for reference sections in text...');
    
    // Enhanced reference section processing with better error handling
    const referenceSectionPatterns = [
        // Standard "References:" format
        /(?:References?|Sources?|Bibliography):\s*\n((?:\d+\.\s*.+?(?:\n|$))*)/gi,
        // Without newline after colon
        /(?:References?|Sources?|Bibliography):\s*((?:\d+\.\s*.+?(?:\n|$))*)/gi,
        // Markdown heading format
        /#{1,3}\s*(?:References?|Sources?|Bibliography)\s*\n((?:\d+\.\s*.+?(?:\n|$))*)/gi,
        // Bold format
        /\*\*(?:References?|Sources?|Bibliography)\*\*\s*\n((?:\d+\.\s*.+?(?:\n|$))*)/gi,
        // Alternative numbered format
        /(?:References?|Sources?|Bibliography)\s*:?\s*\n((?:\[\d+\].*?(?:\n|$))*)/gi,
        // List format without header
        /\n((?:\d+\.\s+[A-Z].{20,}(?:\n|$))+)/gi
    ];
    
    for (const pattern of referenceSectionPatterns) {
        const refSectionMatch = pattern.exec(text);
        
        if (refSectionMatch) {
            console.log('✅ Found reference section:', refSectionMatch[0].substring(0, 100));
            try {
                const referenceSection = refSectionMatch[1];
                if (!referenceSection || referenceSection.trim().length === 0) {
                    console.log('⚠️ Reference section is empty, skipping');
                    continue;
                }
                console.log('📖 Processing reference section:', referenceSection.substring(0, 200));
                
                // More flexible reference line parsing
                const referenceLinePatterns = [
                    /(\d+)\.\s*(.+?)(?=\n|$)/g,           // "1. Reference text"
                    /\[(\d+)\]\s*(.+?)(?=\n|$)/g,        // "[1] Reference text"  
                    /(\d+):\s*(.+?)(?=\n|$)/g,           // "1: Reference text"
                    /(\d+)\)\s*(.+?)(?=\n|$)/g           // "1) Reference text"
                ];

                let foundReferences = false;
                
                for (const referenceLineRegex of referenceLinePatterns) {
                    let refMatch;
                    while ((refMatch = referenceLineRegex.exec(referenceSection)) !== null) {
                        const originalNumber = refMatch[1];
                        const referenceText = refMatch[2].trim();
                        
                        console.log(`🎯 Found reference ${originalNumber}: "${referenceText}"`);
                        
                        // Skip empty or invalid reference text
                        if (!referenceText || referenceText.length === 0) {
                            console.log('⚠️ Empty reference text, skipping');
                            continue;
                        }
                        
                        // Validate reference text before assigning - CRITICAL FILTERING POINT
                        if (!isValidReferenceText(referenceText)) {
                            console.log('🚫 Skipping invalid reference text:', referenceText);
                            continue;
                        }
                        
                        // Use the correct mapping - originalToNewReferenceMap instead of referenceMap
                        const reference = originalToNewReferenceMap.get(originalNumber);
                        if (reference) {
                            console.log(`✅ Assigning reference ${originalNumber} -> ${reference.number}: "${referenceText}"`);
                            reference.text = referenceText;
                            foundReferences = true;
                            
                            // Extract URL with better pattern matching
                            const urlPatterns = [
                                /(https?:\/\/[^\s\)\]\}]+)/,
                                /(www\.[^\s\)\]\}]+)/,
                                /doi:\s*([^\s\)\]\}]+)/i
                            ];
                            
                            for (const urlPattern of urlPatterns) {
                                const urlMatch = referenceText.match(urlPattern);
                                if (urlMatch) {
                                    let url = urlMatch[1];
                                    if (!url.startsWith('http') && !url.startsWith('doi:')) {
                                        url = 'https://' + url;
                                    }
                                    reference.url = url;
                                    break;
                                }
                            }
                        } else {
                            console.warn(`No reference object found for original number ${originalNumber}`);
                        }
                    }
                    
                    // If we found references with this pattern, don't try others
                    if (foundReferences) break;
                }

                // Rebuild reference section as bullet list with superscript numbers at the end
                if (extractedReferences.length > 0) {
                    const sortedReferences = extractedReferences.sort((a, b) => a.number - b.number);
                    const superscriptMap: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
                    const toSuperscript = (n: number) => String(n).split('').map(d => superscriptMap[d] || d).join('');
                    const readableSection = sortedReferences
                        .map(ref => `- ${ref.text} ${toSuperscript(ref.number)}`)
                        .join('\n');
                    const rebuilt = `References:\n\n${readableSection}\n`;
                    processedText = processedText.replace(refSectionMatch[0], rebuilt);
                }
                
                break; // Only process the first matching pattern
            } catch (error) {
                console.warn('Error processing reference section:', error);
                continue;
            }
        }
    }

    // Fallback: if a References section still contains numbered items, convert to bullets
    try {
        const fallbackRegex = /((?:References?|Sources?|Bibliography):\s*\n)([\s\S]+?)(?=\n{2,}|$)/i;
        const fallback = processedText.match(fallbackRegex);
        if (fallback && fallback[2]) {
            const originalBlock = fallback[0];
            const header = fallback[1];
            const listBody = fallback[2]
                .split(/\n/)
                .map(line => {
                    if (/^\s*\d+\.\s+/.test(line)) {
                        return line.replace(/^\s*\d+\.\s+/, '- ');
                    }
                    return line;
                })
                .join('\n');
            const rebuilt = `${header}\n${listBody}\n`;
            processedText = processedText.replace(originalBlock, rebuilt);
        }
    } catch (e) {
        console.warn('Bullet list fallback failed:', e);
    }

    // If no reference section was found, check if we can extract any inline reference info
    if (extractedReferences.some(ref => ref.text.includes('(source not provided)'))) {
        
        // Try to extract any parenthetical citations or author names near the footnotes
        extractedReferences.forEach(ref => {
            const originalNum = Array.from(originalToNewReferenceMap.entries())
                .find(([_, refObj]) => refObj.id === ref.id)?.[0];
            
            if (originalNum && ref.text.includes('(source not provided)')) {
                // Look for patterns like "Smith et al. [^1]" or "[^1] (Johnson, 2023)"
                const patterns = [
                    new RegExp(`([A-Z][a-zA-Z]+ et al\\.?).*?\\[\\^?${originalNum}\\]`, 'g'),
                    new RegExp(`\\[\\^?${originalNum}\\].*?\\(([^)]+)\\)`, 'g'),
                    new RegExp(`([A-Z][a-zA-Z]+,? \\d{4}).*?\\[\\^?${originalNum}\\]`, 'g'),
                ];
                
                for (const pattern of patterns) {
                    const match = pattern.exec(text);
                    if (match && match[1]) {
                        const extractedText = match[1].trim();
                        // Validate extracted text before assigning
                        if (isValidReferenceText(extractedText)) {
                            ref.text = extractedText;
                            break;
                        } else {
                            console.log('🚫 Skipping invalid inline reference:', extractedText);
                        }
                    }
                }
            }
        });
    }

    // Clean up: Remove references that still have placeholder text (meaning no valid text was found)
    const validExtractedReferences = extractedReferences.filter(ref => {
        if (ref.text.includes('(source not provided)')) {
            console.log('🧹 Removing reference with no valid source found:', ref.number);
            return false;
        }
        return true;
    });

    // If we filtered out references, we need to clean up the processed text to remove orphaned footnotes
    if (validExtractedReferences.length < extractedReferences.length) {
        console.log(`🔧 Cleaned up ${extractedReferences.length - validExtractedReferences.length} invalid references`);
        
        // Remove footnote citations for references that were filtered out
        const validNumbers = new Set(validExtractedReferences.map(r => r.number));
        const footnoteRegex = /\[\^(\d+)\]/g;
        
        processedText = processedText.replace(footnoteRegex, (match, num) => {
            const number = parseInt(num);
            if (!validNumbers.has(number)) {
                console.log('🧹 Removing orphaned footnote citation:', match);
                return '';
            }
            return match;
        });
    }

    // Convert footnote-style citations [^n] to unicode superscripts in-text
    try {
        const superscriptMap: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
        const toSuperscript = (numStr: string) => numStr.split('').map(d => superscriptMap[d] || d).join('');
        processedText = processedText.replace(/\[\^(\d+)\]/g, (_, n: string) => toSuperscript(n));
    } catch (e) {
        console.warn('Superscript conversion failed:', e);
    }

    return {
        text: processedText,
        extractedReferences: validExtractedReferences
    };
}

export function processMessageReferences(
    messageText: string,
    messageId: string,
    threadReferences: ThreadReference[]
): { processedText: string; newReferences: ThreadReference[] } {
    try {
        // Input validation
        if (!messageText) {
            return {
                processedText: '',
                newReferences: []
            };
        }
        
        if (!messageId) {
            console.warn('processMessageReferences called without messageId');
            return {
                processedText: messageText,
                newReferences: []
            };
        }
        
        const processed = extractReferencesFromText(messageText, messageId, threadReferences || []);
        
        return {
            processedText: processed.text,
            newReferences: processed.extractedReferences
        };
    } catch (error) {
        console.error('Error processing message references:', error);
        // Return original text on error to prevent data loss
        return {
            processedText: messageText,
            newReferences: []
        };
    }
}

export function updateThreadReferences(
    currentReferences: ThreadReference[],
    newReferences: ThreadReference[]
): ThreadReference[] {
    try {
        // Handle null/undefined inputs
        const current = currentReferences || [];
        const newRefs = newReferences || [];
        
        if (newRefs.length === 0) {
            return current;
        }
        
        const referenceMap = new Map(current.map(ref => [ref.id, ref]));
        
        newRefs.forEach(newRef => {
            // Validate reference before adding
            if (newRef && newRef.id && newRef.number && newRef.text && newRef.messageId) {
                referenceMap.set(newRef.id, newRef);
            } else {
                console.warn('Invalid reference skipped:', newRef);
            }
        });
        
        const result = Array.from(referenceMap.values()).sort((a, b) => a.number - b.number);
        
        // Validate final result
        const numbers = result.map(r => r.number);
        const uniqueNumbers = new Set(numbers);
        
        if (numbers.length !== uniqueNumbers.size) {
            console.error('Duplicate reference numbers detected, attempting to fix...');
            return renumberAllReferences(result);
        }
        
        return result;
    } catch (error) {
        console.error('Error updating thread references:', error);
        return currentReferences || [];
    }
}

export function renumberAllReferences(threadReferences: ThreadReference[]): ThreadReference[] {
    return threadReferences.map((ref, index) => ({
        ...ref,
        number: index + 1
    }));
}