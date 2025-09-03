import type { ThreadReference } from './referenceProcessor';

export interface ReferenceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fixedReferences?: ThreadReference[];
}

export function validateReference(reference: ThreadReference): ReferenceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required field validation
  if (!reference.id || typeof reference.id !== 'string') {
    errors.push('Reference must have a valid string ID');
  }

  if (!reference.text || typeof reference.text !== 'string') {
    errors.push('Reference must have valid text content');
  } else if (reference.text.trim().length === 0) {
    errors.push('Reference text cannot be empty or whitespace only');
  }

  if (!reference.messageId || typeof reference.messageId !== 'string') {
    errors.push('Reference must have a valid messageId');
  }

  if (typeof reference.number !== 'number' || reference.number < 1) {
    errors.push('Reference number must be a positive integer');
  }

  // Optional field validation
  if (reference.url && typeof reference.url === 'string') {
    const urlPattern = /^(https?:\/\/|www\.|doi:)/i;
    if (!urlPattern.test(reference.url)) {
      warnings.push('Reference URL does not appear to be a valid web address');
    }
  }

  if (reference.title && typeof reference.title !== 'string') {
    warnings.push('Reference title must be a string if provided');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateThreadReferences(references: ThreadReference[]): ReferenceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let fixedReferences: ThreadReference[] | undefined;

  if (!Array.isArray(references)) {
    return {
      isValid: false,
      errors: ['References must be an array'],
      warnings: []
    };
  }

  // Check for duplicate IDs
  const ids = references.map(ref => ref.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate reference IDs found: ${[...new Set(duplicateIds)].join(', ')}`);
  }

  // Check for duplicate numbers
  const numbers = references.map(ref => ref.number);
  const duplicateNumbers = numbers.filter((num, index) => numbers.indexOf(num) !== index);
  if (duplicateNumbers.length > 0) {
    errors.push(`Duplicate reference numbers found: ${[...new Set(duplicateNumbers)].join(', ')}`);
  }

  // Check for sequential numbering
  const sortedNumbers = [...numbers].sort((a, b) => a - b);
  const expectedNumbers = Array.from({length: numbers.length}, (_, i) => i + 1);
  
  if (JSON.stringify(sortedNumbers) !== JSON.stringify(expectedNumbers)) {
    warnings.push('Reference numbers are not sequential starting from 1');
    
    // Attempt to fix by renumbering
    fixedReferences = references
      .sort((a, b) => a.number - b.number)
      .map((ref, index) => ({
        ...ref,
        number: index + 1
      }));
  }

  // Validate each reference individually
  const individualValidations = references.map((ref, index) => {
    const validation = validateReference(ref);
    return {
      index,
      ...validation
    };
  });

  // Collect all individual errors and warnings
  individualValidations.forEach(validation => {
    validation.errors.forEach(error => {
      errors.push(`Reference ${validation.index + 1}: ${error}`);
    });
    validation.warnings.forEach(warning => {
      warnings.push(`Reference ${validation.index + 1}: ${warning}`);
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    fixedReferences
  };
}

export function sanitizeReference(reference: Partial<ThreadReference>): ThreadReference | null {
  try {
    // Attempt to create a valid reference from partial data
    const sanitized: ThreadReference = {
      id: reference.id || '',
      text: reference.text || '',
      messageId: reference.messageId || '',
      number: reference.number || 0,
      ...(reference.url && { url: reference.url }),
      ...(reference.title && { title: reference.title })
    };

    const validation = validateReference(sanitized);
    
    if (validation.isValid) {
      return sanitized;
    } else {
      console.warn('Cannot sanitize invalid reference:', validation.errors);
      return null;
    }
  } catch (error) {
    console.error('Error sanitizing reference:', error);
    return null;
  }
}

export function repairThreadReferences(references: ThreadReference[]): {
  repaired: ThreadReference[];
  issues: string[];
} {
  const issues: string[] = [];
  let repaired = [...references];

  try {
    // Remove invalid references
    const validReferences = repaired.filter(ref => {
      const validation = validateReference(ref);
      if (!validation.isValid) {
        issues.push(`Removed invalid reference: ${validation.errors.join(', ')}`);
        return false;
      }
      return true;
    });

    // Remove duplicates by ID
    const seenIds = new Set<string>();
    const deduplicatedById = validReferences.filter(ref => {
      if (seenIds.has(ref.id)) {
        issues.push(`Removed duplicate reference with ID: ${ref.id}`);
        return false;
      }
      seenIds.add(ref.id);
      return true;
    });

    // Fix numbering
    const renumbered = deduplicatedById
      .sort((a, b) => a.number - b.number)
      .map((ref, index) => {
        const newNumber = index + 1;
        if (ref.number !== newNumber) {
          issues.push(`Renumbered reference "${ref.text.substring(0, 50)}..." from ${ref.number} to ${newNumber}`);
        }
        return {
          ...ref,
          number: newNumber
        };
      });

    return {
      repaired: renumbered,
      issues
    };
  } catch (error) {
    console.error('Error repairing thread references:', error);
    return {
      repaired: references,
      issues: [`Error during repair: ${error}`]
    };
  }
}