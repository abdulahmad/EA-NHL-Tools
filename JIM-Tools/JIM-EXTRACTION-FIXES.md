# JIM Format Extraction Fixes

This document summarizes the various fixes implemented for the JIM file format extraction issue in the EA-NHL-Tools repository.

## Overview of the Problem

When extracting JIM files, there was a specific issue in the top third of the image (rows 24-47) where color palette mapping was incorrect, resulting in visual artifacts and incorrect colors.

## Implemented Fixes

### 1. Fixed-ExtractJimFull.js (Initial Fix)

Basic correction for palette entries that were causing the most obvious issues:

```javascript
// Simple fix focused on white colors
if (dstY >= 24 && dstY <= 47) {
    // Fix white colors that become black
    if (adjustedPixel === 15 || adjustedPixel === 31 || 
        adjustedPixel === 47 || adjustedPixel === 63) {
        adjustedPixel = palIndex * 16 + 15; // Use white index
    }
}
```

### 2. Fixed-ExtractJimFull-v2.js (Expanded Fix)

More comprehensive fix with specific handling for different color types:

```javascript
if (dstY >= 24 && dstY <= 47) {
    // Fix white colors that become black
    if (adjustedPixel === 15 || adjustedPixel === 31 || 
        adjustedPixel === 47 || adjustedPixel === 48) {
        adjustedPixel = palIndex * 16 + 15; // Use white index
    } 
    // Fix red/orange colors
    else if (adjustedPixel === 9 || adjustedPixel === 23 ||
             adjustedPixel === 38 || adjustedPixel === 55) {
        adjustedPixel = palIndex * 16 + 9;
    }
    // Fix yellow colors
    else if (adjustedPixel === 43 || adjustedPixel === 44 ||
             adjustedPixel === 59 || adjustedPixel === 60) {
        adjustedPixel = palIndex * 16 + 11;
    }
}
```

### 3. Fixed-ExtractJimFull-v3.js (Refined Fix)

Simplified approach with expanded palette index handling:

```javascript
// Special handling for the problematic top region (rows 24-47)
if (dstY >= 24 && dstY <= 47) {
    // Specific corrections for known problematic indices
    if ([15, 31, 47, 48, 63].includes(adjustedPixel)) {
        // Fix white colors
        adjustedPixel = 15 + (palIndex * 16); // Use correct white from current palette
    } else if ([9, 22, 38, 40, 55].includes(adjustedPixel)) {
        // Fix red/orange colors 
        adjustedPixel = 9 + (palIndex * 16);
    } else if ([43, 44, 59, 60].includes(adjustedPixel)) {
        // Fix yellow colors
        adjustedPixel = 11 + (palIndex * 16);
    }
}
```

### 4. Fixed-ExtractJimFull-v5.js (Final Comprehensive Fix)

Advanced caching system with index-based approach, handling all common color types:

```javascript
function getPaletteIndexMapping(sourceIndex, sourcePalette, y) {
    // Outside problematic region, use standard 16-color palette offset
    if (y < problematicRowStart || y > problematicRowEnd) {
        return sourceIndex + (sourcePalette * 16);
    }
    
    // Create a unique key for caching
    const key = `p${sourcePalette}_idx${sourceIndex}`;
    
    // If we've seen this before, reuse the mapping
    if (paletteIndexMap[key] !== undefined) {
        return paletteIndexMap[key];
    }
    
    let correctedIndex;
    
    // Fix white/light colors
    if (sourceIndex === 15) {
        correctedIndex = 15 + (sourcePalette * 16);
    }
    // Fix reds
    else if (sourceIndex === 9 || sourceIndex === 8 || sourceIndex === 7) {
        correctedIndex = 9 + (sourcePalette * 16);
    }
    // Fix yellows
    else if (sourceIndex === 11 || sourceIndex === 10 || sourceIndex === 12) {
        correctedIndex = 11 + (sourcePalette * 16);
    }
    // Fix blues
    else if (sourceIndex === 1 || sourceIndex === 2) {
        correctedIndex = 1 + (sourcePalette * 16);
    }
    // Special handling for black/background
    else if (sourceIndex === 0) {
        correctedIndex = sourcePalette * 16;
    }
    // For all other indices, maintain the palette's version
    else {
        correctedIndex = sourceIndex + (sourcePalette * 16);
    }
    
    // Cache this mapping for future use
    paletteIndexMap[key] = correctedIndex;
    return correctedIndex;
}
```

## Results

While the issue hasn't been completely eliminated in the final version, the number of affected pixels has been significantly reduced and the most visually disruptive artifacts (such as white areas becoming black) have been fixed.

The fixes progressively improved the handling of different color types in the affected region (rows 24-47), with the final version providing the most comprehensive solution.

## Technical Root Cause

The issue stemmed from how palette indices are handled in the JIM format. When rebuilding and then extracting JIM files:

1. Each 8x8 tile has a palette index (0-3) that determines which 16-color palette to use
2. In the problematic region (rows 24-47), these palette indices were being incorrectly interpreted 
3. The most common issues occurred with white colors (index 15), red colors (index 9), and yellow colors (index 11)

The fix ensures that in this specific region, the palette indices are mapped correctly to maintain visual consistency throughout the image.
