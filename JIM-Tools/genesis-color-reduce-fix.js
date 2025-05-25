// Modified version of calculateImportanceImbalance function to handle low color images better
// This can replace the existing function in genesis-color-reduce.js

// Calculate importance-based imbalance (weighs colors by usage frequency)
// Modified to handle low-color images better
function calculateImportanceImbalance(colorSets) {
    // Calculate importance score for each quadrant with normalization
    const importanceScores = colorSets.map(colors => {
        // Skip empty regions or handle them specially
        if (colors.length === 0) return 0;
        
        // Get total pixel count in this section for normalization
        const totalPixels = colors.reduce((sum, color) => sum + color.count, 0);
        if (totalPixels === 0) return 0;
        
        // For very low color images, use a more balanced approach
        if (colors.length <= 3) {
            // When there are very few colors, avoid overweighting by using sqrt instead
            return Math.sqrt(totalPixels);
        }
        
        // Calculate importance using a less aggressive power (0.5 instead of 0.75)
        // and normalize by total pixels in the section
        return colors.reduce((sum, color) => {
            return sum + Math.pow(color.count / totalPixels, 0.5) * Math.sqrt(totalPixels);
        }, 0);
    });
    
    // If any section has an extreme importance score, cap it
    const maxScore = Math.max(...importanceScores);
    const minScore = Math.min(...importanceScores.filter(s => s > 0)); // Ignore zero scores
    
    // Apply a logarithmic difference to avoid extreme values dominating
    return Math.log(1 + maxScore) - Math.log(1 + minScore);
}

// Usage instructions:
// 1. Copy this function into genesis-color-reduce.js, replacing the existing calculateImportanceImbalance function
// 2. This modified version will work better with low-color images such as 3-bit converted BMPs
// 3. It should work with both sections=4 and sections=9 modes
