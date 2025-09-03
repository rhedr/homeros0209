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

    console.log(`Processing message with ${existingReferences.length} existing thread references`);

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

    console.log(`Found ${originalNumbers.size} unique reference numbers: [${Array.from(originalNumbers).join(', ')}]`);

    // Create reference objects for each unique original number
    for (const originalNumber of originalNumbers) {
        const newReference: ThreadReference = {
            id: uuidv4(),
            text: `Reference ${originalNumber}`, // Temporary text, will be updated from reference section
            messageId,
            number: nextReferenceNumber
        };
        
        originalToNewReferenceMap.set(originalNumber, newReference);
        numberMappings.set(originalNumber, nextReferenceNumber);
        extractedReferences.push(newReference);
        
        console.log(`Mapping: original [${originalNumber}] → new [${nextReferenceNumber}]`);
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
    
    // Apply all replacements in a single pass
    for (const [original, replacement] of replacements) {
        processedText = processedText.replaceAll(original, replacement);
        console.log(`Replaced: ${original} → ${replacement}`);
    }

    // Enhanced reference section processing with better error handling
    const referenceSectionPatterns = [
        /(?:References?|Sources?|Bibliography):\s*\n((?:\d+\.\s*.+?\n?)*)/gi,
        /(?:References?|Sources?|Bibliography):\s*((?:\d+\.\s*.+?(?:\n|$))*)/gi,
        /## References?\s*\n((?:\d+\.\s*.+?\n?)*)/gi,
        /\*\*References?\*\*\s*\n((?:\d+\.\s*.+?\n?)*)/gi
    ];

    for (const pattern of referenceSectionPatterns) {
        const refSectionMatch = pattern.exec(text);
        
        if (refSectionMatch) {
            try {
                const referenceSection = refSectionMatch[1];
                if (!referenceSection || referenceSection.trim().length === 0) {
                    continue;
                }
                
                const referenceLineRegex = /(\d+)\.\s*(.+?)(?=\n|$)/g;
                
                let refMatch;
                while ((refMatch = referenceLineRegex.exec(referenceSection)) !== null) {
                    const originalNumber = refMatch[1];
                    const referenceText = refMatch[2].trim();
                    
                    // Skip empty or invalid reference text
                    if (!referenceText || referenceText.length === 0) {
                        continue;
                    }
                    
                    // Use the correct mapping - originalToNewReferenceMap instead of referenceMap
                    const reference = originalToNewReferenceMap.get(originalNumber);
                    if (reference) {
                        reference.text = referenceText;
                        console.log(`Updated reference [${reference.number}] text: ${referenceText}`);
                        
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
                                console.log(`Extracted URL for reference [${reference.number}]: ${url}`);
                                break;
                            }
                        }
                    } else {
                        console.warn(`No reference object found for original number ${originalNumber}`);
                    }
                }

                // Rebuild reference section with new numbers - CRUCIAL FIX
                if (extractedReferences.length > 0) {
                    // Sort by the NEW number to ensure proper order
                    const sortedReferences = extractedReferences.sort((a, b) => a.number - b.number);
                    
                    // Create TWO formats:
                    // 1. Readable format for display
                    const readableSection = sortedReferences
                        .map(ref => `${ref.number}. ${ref.text}`)
                        .join('\n');
                    
                    // 2. remark-gfm compatible footnote definitions 
                    const footnoteDefinitions = sortedReferences
                        .map(ref => `[^${ref.number}]: ${ref.text}`)
                        .join('\n');
                    
                    console.log(`Rebuilding reference section with ${sortedReferences.length} references`);
                    sortedReferences.forEach(ref => {
                        console.log(`  ${ref.number}. ${ref.text}`);
                    });
                    
                    // Use ONLY the remark-gfm compatible format to avoid conflicts
                    processedText = processedText.replace(
                        refSectionMatch[0], 
                        footnoteDefinitions
                    );
                }
                
                break; // Only process the first matching pattern
            } catch (error) {
                console.warn('Error processing reference section:', error);
                continue;
            }
        }
    }

    return {
        text: processedText,
        extractedReferences
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