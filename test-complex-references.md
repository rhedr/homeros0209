# Complex Reference Scenarios Test

This document contains various reference formats to test the robustness of our reference system.

## Test Case 1: Mixed Reference Formats

Based on recent research [^1] and studies [2], we can see multiple approaches (^3) to this problem.

Some additional context [4] shows that (5) these methods work well.

References:
1. Smith et al. (2023) - Advanced AI Research - https://example.com/paper1
2. Jones Research Institute - Modern Computing Approaches  
3. Brown, J. (2024) "New Methodologies" doi:10.1234/example
4. Taylor & Associates - Industry Report 2024 - www.taylor-research.com
5. Wilson, M. - Comprehensive Analysis (no URL)

## Test Case 2: Duplicate Numbers (Should be renumbered)

This cites reference [^1] and another [^1] that should be the same.

Then we have [2] and later another [2] reference.

References:  
1. First Reference - https://first.com
2. Second Reference - https://second.com

## Test Case 3: Non-sequential Numbers (Should be fixed)

Here's reference [^5] followed by [^1] and then [^3].

References:
5. Fifth Reference Originally
1. First Reference Originally  
3. Third Reference Originally

## Test Case 4: Various Reference Section Formats

### Using ## Headers
## References
1. Header-style reference

### Using **Bold**
**References**
1. Bold-style reference

### Using Different Names
Sources:
1. Alternative naming convention

Bibliography:
1. Academic style naming

## Test Case 5: Edge Cases

Empty references: [^999] (should be ignored as too high)
Year-like references: The study from (2019) should not be treated as reference
Valid but high: Reference [^50] should work

References:
50. High-numbered but valid reference

## Test Case 6: Malformed References

Some text with [invalid] and [^invalid] and incomplete

Reference without number: [^] 
Reference with letters: [^a] 
Reference with special chars: [^1@]

References:
(This section intentionally left incomplete to test error handling)

## Test Case 7: URL Extraction Tests

Various URL formats in references:

References:
1. Simple HTTP - http://example.com/page
2. HTTPS variant - https://secure.example.com/document
3. WWW format - www.example.com/resource
4. DOI format - doi:10.1234/example.article
5. Mixed content - Study by Smith (2023) available at https://research.edu/study
6. Multiple URLs - Main: https://main.com backup: https://backup.org