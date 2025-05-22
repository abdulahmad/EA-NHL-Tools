// comprehensive-color-test.js
// A comprehensive test of color conversion between various methods
import { writeFileSync } from 'fs';

let output = "";

// Helper function to log to both console and output string
function log(str) {
    console.log(str);
    output += str + "\n";
}

// === COLOR CONVERSION METHODS ===

// From rebuildJim.js - Original conversion using 36.428 factor
function RGBToGenesisColor_Original(r, g, b) {
    // Convert from 8-bit (0-255) to 3-bit (0-7)
    const r3 = Math.min(7, Math.round(r / 36.428));
    const g3 = Math.min(7, Math.round(g / 36.428));
    const b3 = Math.min(7, Math.round(b / 36.428));

    // Pack into 16-bit genesis format (0000BBB0GGG0RRR0)
    return ((b3 & 0x07) << 9) | ((g3 & 0x07) << 5) | ((r3 & 0x07) << 1);
}

// Alternative using exact 255/7 factor - mathematically equivalent but more explicit
function RGBToGenesisColor_Exact(r, g, b) {
    // Convert from 8-bit (0-255) to 3-bit (0-7)
    const r3 = Math.min(7, Math.round(r * 7 / 255));
    const g3 = Math.min(7, Math.round(g * 7 / 255));
    const b3 = Math.min(7, Math.round(b * 7 / 255));

    // Pack into 16-bit genesis format (0000BBB0GGG0RRR0)
    return ((b3 & 0x07) << 9) | ((g3 & 0x07) << 5) | ((r3 & 0x07) << 1);
}

// From extractJimFull.js - Original implementation with 32 as scaling factor (pre-fix)
function genesisColorToRGB_Original(word) {
    const blue = (word >> 9) & 0x07;  // Bits 9-11
    const green = (word >> 5) & 0x07; // Bits 5-7
    const red = (word >> 1) & 0x07;   // Bits 1-3

    // Scale from 3-bit (0-7) to 8-bit (0-255)
    return [
        red * 32,    // Multiply by 32 to scale from 0-7 to 0-224
        green * 32,
        blue * 32
    ];
}

// Using 36.428 as factor - matches rebuildJim.js (potential fix)
function genesisColorToRGB_36Factor(word) {
    const blue = (word >> 9) & 0x07;  // Bits 9-11
    const green = (word >> 5) & 0x07; // Bits 5-7
    const red = (word >> 1) & 0x07;   // Bits 1-3

    // Scale from 3-bit (0-7) to 8-bit (0-255)
    return [
        Math.round(red * 36.428),
        Math.round(green * 36.428),
        Math.round(blue * 36.428)
    ];
}

// Using exact 255/7 factor - mathematically correct approach
function genesisColorToRGB_Exact(word) {
    const blue = (word >> 9) & 0x07;  // Bits 9-11
    const green = (word >> 5) & 0x07; // Bits 5-7
    const red = (word >> 1) & 0x07;   // Bits 1-3

    // Scale from 3-bit (0-7) to 8-bit (0-255)
    return [
        Math.round(red * 255 / 7),
        Math.round(green * 255 / 7),
        Math.round(blue * 255 / 7)
    ];
}

// === TEST FUNCTIONS ===

// Generate the full range of Genesis colors
function generateFullGenesisColorRange() {
    const colors = [];
    for (let r = 0; r <= 7; r++) {
        for (let g = 0; g <= 7; g++) {
            for (let b = 0; b <= 7; b++) {
                const genesisColor = ((b & 0x07) << 9) | ((g & 0x07) << 5) | ((r & 0x07) << 1);
                colors.push(genesisColor);
            }
        }
    }
    return colors;
}

// Generate a representative sample of RGB colors
function generateRGBSample() {
    const colors = [];
    // Basic colors
    colors.push([0, 0, 0]);       // Black
    colors.push([255, 0, 0]);     // Red
    colors.push([0, 255, 0]);     // Green
    colors.push([0, 0, 255]);     // Blue
    colors.push([255, 255, 0]);   // Yellow
    colors.push([255, 0, 255]);   // Magenta
    colors.push([0, 255, 255]);   // Cyan
    colors.push([255, 255, 255]); // White
    
    // Grayscale
    for (let i = 0; i <= 255; i += 32) {
        colors.push([i, i, i]);
    }
    
    // Random sampling of RGB space
    for (let i = 0; i < 20; i++) {
        colors.push([
            Math.floor(Math.random() * 256),
            Math.floor(Math.random() * 256),
            Math.floor(Math.random() * 256)
        ]);
    }
    
    return colors;
}

// Test RGB → Genesis → RGB roundtrip (color accuracy loss)
function testRGBRoundTrip() {
    log("\n=== RGB → Genesis → RGB Roundtrip Test ===");
    log("Testing how RGB values map to Genesis and back");
    log("Original RGB | Genesis | RGB (32 Factor) | RGB (36.428) | RGB (255/7) | Best Match");
    log("-------------------------------------------------------------------------");
    
    const rgbSample = generateRGBSample();
    let stats = {
        original: { matches: 0 },
        factor36: { matches: 0 },
        exact: { matches: 0 }
    };
    
    for (const [r, g, b] of rgbSample) {
        const genesisColor = RGBToGenesisColor_Original(r, g, b);
        
        const [r1, g1, b1] = genesisColorToRGB_Original(genesisColor);
        const [r2, g2, b2] = genesisColorToRGB_36Factor(genesisColor);
        const [r3, g3, b3] = genesisColorToRGB_Exact(genesisColor);
        
        // Calculate color distance (Euclidean in RGB space)
        const dist1 = Math.sqrt(Math.pow(r-r1, 2) + Math.pow(g-g1, 2) + Math.pow(b-b1, 2));
        const dist2 = Math.sqrt(Math.pow(r-r2, 2) + Math.pow(g-g2, 2) + Math.pow(b-b2, 2));
        const dist3 = Math.sqrt(Math.pow(r-r3, 2) + Math.pow(g-g3, 2) + Math.pow(b-b3, 2));
        
        // Determine the best match
        const minDist = Math.min(dist1, dist2, dist3);
        let bestMatch = "";
        
        if (minDist === dist1) {
            bestMatch = "32 Factor";
            stats.original.matches++;
        } else if (minDist === dist2) {
            bestMatch = "36.428";
            stats.factor36.matches++;
        } else {
            bestMatch = "255/7";
            stats.exact.matches++;
        }
        
        log(`${r},${g},${b} | ${genesisColor.toString(16).toUpperCase().padStart(4, '0')} | ${r1},${g1},${b1} | ${r2},${g2},${b2} | ${r3},${g3},${b3} | ${bestMatch}`);
    }
    
    // Report statistics
    log("\nMatches by method:");
    log(`32 Factor: ${stats.original.matches} matches`);
    log(`36.428 Factor: ${stats.factor36.matches} matches`);
    log(`255/7 Factor: ${stats.exact.matches} matches`);
    log(`Total colors tested: ${rgbSample.length}`);
}

// Test Genesis → RGB → Genesis roundtrip (value preservation)
function testGenesisRoundTrip() {
    log("\n=== Genesis → RGB → Genesis Roundtrip Test ===");
    log("Testing if Genesis color values are preserved when converted to RGB and back");
    log("Genesis | RGB (32) | Genesis' | RGB (36.428) | Genesis'' | RGB (255/7) | Genesis'''");
    log("-------------------------------------------------------------------------");
    
    // Get a subset of all possible Genesis colors for testing
    const genesisColors = [];
    for (let r = 0; r <= 7; r++) {
        for (let g = 0; g <= 7; g++) {
            for (let b = 0; b <= 7; b++) {
                // Skip some combinations to keep test manageable
                if ((r + g + b) % 3 === 0) {
                    const genesisColor = ((b & 0x07) << 9) | ((g & 0x07) << 5) | ((r & 0x07) << 1);
                    genesisColors.push(genesisColor);
                }
            }
        }
    }
    
    let stats = {
        original: { matches: 0, total: 0 },
        factor36: { matches: 0, total: 0 },
        exact: { matches: 0, total: 0 }
    };
    
    for (const genesisColor of genesisColors) {
        // Get RGB values
        const [r1, g1, b1] = genesisColorToRGB_Original(genesisColor);
        const [r2, g2, b2] = genesisColorToRGB_36Factor(genesisColor);
        const [r3, g3, b3] = genesisColorToRGB_Exact(genesisColor);
        
        // Convert back to Genesis colors
        const genesisColor1 = RGBToGenesisColor_Original(r1, g1, b1);
        const genesisColor2 = RGBToGenesisColor_Original(r2, g2, b2);
        const genesisColor3 = RGBToGenesisColor_Original(r3, g3, b3);
        
        // Check if we got back the original Genesis color
        const match1 = genesisColor === genesisColor1 ? "✓" : "✗";
        const match2 = genesisColor === genesisColor2 ? "✓" : "✗";
        const match3 = genesisColor === genesisColor3 ? "✓" : "✗";
        
        // Update stats
        stats.original.total++;
        stats.factor36.total++;
        stats.exact.total++;
        
        if (match1 === "✓") stats.original.matches++;
        if (match2 === "✓") stats.factor36.matches++;
        if (match3 === "✓") stats.exact.matches++;
        
        log(`${genesisColor.toString(16).toUpperCase().padStart(4, '0')} | ${r1},${g1},${b1} | ${genesisColor1.toString(16).toUpperCase().padStart(4, '0')} ${match1} | ${r2},${g2},${b2} | ${genesisColor2.toString(16).toUpperCase().padStart(4, '0')} ${match2} | ${r3},${g3},${b3} | ${genesisColor3.toString(16).toUpperCase().padStart(4, '0')} ${match3}`);
    }
    
    // Report statistics
    log("\nGenesis color preservation by method:");
    log(`32 Factor: ${stats.original.matches}/${stats.original.total} preserved (${Math.round(stats.original.matches/stats.original.total*100)}%)`);
    log(`36.428 Factor: ${stats.factor36.matches}/${stats.factor36.total} preserved (${Math.round(stats.factor36.matches/stats.factor36.total*100)}%)`);
    log(`255/7 Factor: ${stats.exact.matches}/${stats.exact.total} preserved (${Math.round(stats.exact.matches/stats.exact.total*100)}%)`);
}

// Test scale factors results
function testScaleFactors() {
    log("\n=== 3-bit to 8-bit Scale Factors Comparison ===");
    log("3-bit\t*32\t*36.428\t*(255/7)\tIdeal (255*bit/7)");
    log("-----------------------------------------------");
    
    for (let i = 0; i <= 7; i++) {
        const scale32 = i * 32;
        const scale36 = Math.round(i * 36.428);
        const scaleExact = Math.round(i * 255 / 7);
        const ideal = (i * 255 / 7);
        log(`${i}\t${scale32}\t${scale36}\t${scaleExact}\t${ideal.toFixed(2)}`);
    }
}

// Compare conversion implementations (36.428 vs 255/7)
function compareImplementations() {
    log("\n=== Implementation Comparison: 36.428 vs 255/7 ===");
    log("Testing if both implementations produce the same results");
    
    // Test RGB to Genesis
    log("\nRGB → Genesis conversion:");
    log("R\tG\tB\t36.428 Factor\t255/7 Factor\tMatch?");
    log("-----------------------------------------------");
    
    let rgbToGenesisMatches = 0;
    const rgbSample = generateRGBSample();
    
    for (const [r, g, b] of rgbSample) {
        const genesis1 = RGBToGenesisColor_Original(r, g, b);
        const genesis2 = RGBToGenesisColor_Exact(r, g, b);
        const match = genesis1 === genesis2 ? "✓" : "✗";
        
        if (match === "✓") rgbToGenesisMatches++;
        
        log(`${r}\t${g}\t${b}\t${genesis1.toString(16).toUpperCase().padStart(4, '0')}\t${genesis2.toString(16).toUpperCase().padStart(4, '0')}\t${match}`);
    }
    
    // Test Genesis to RGB
    log("\nGenesis → RGB conversion:");
    log("Genesis\t36.428 Factor\t255/7 Factor\tMatch?");
    log("-----------------------------------------------");
    
    let genesisToRgbMatches = 0;
    const genesisColors = generateFullGenesisColorRange().slice(0, 50); // Take just 50 samples
    
    for (const color of genesisColors) {
        const [r1, g1, b1] = genesisColorToRGB_36Factor(color);
        const [r2, g2, b2] = genesisColorToRGB_Exact(color);
        const match = (r1 === r2 && g1 === g2 && b1 === b2) ? "✓" : "✗";
        
        if (match === "✓") genesisToRgbMatches++;
        
        log(`${color.toString(16).toUpperCase().padStart(4, '0')}\t${r1},${g1},${b1}\t${r2},${g2},${b2}\t${match}`);
    }
    
    // Report statistics
    log("\nImplementation match statistics:");
    log(`RGB → Genesis: ${rgbToGenesisMatches}/${rgbSample.length} matches (${Math.round(rgbToGenesisMatches/rgbSample.length*100)}%)`);
    log(`Genesis → RGB: ${genesisToRgbMatches}/${genesisColors.length} matches (${Math.round(genesisToRgbMatches/genesisColors.length*100)}%)`);
}

// Evaluate new potential color factors with different rounding methods
function evaluateRoundingMethods() {
    log("\n=== Rounding Method Evaluation ===");
    log("Testing different rounding methods with 255/7 factor");
    
    const genesisColors = [];
    for (let i = 0; i <= 7; i++) {
        genesisColors.push(i);
    }
    
    log("\n3-bit → 8-bit Conversion:");
    log("3-bit\tMath.round\tMath.floor\tMath.ceil");
    log("-----------------------------------");
    
    for (const color of genesisColors) {
        const round = Math.round(color * 255 / 7);
        const floor = Math.floor(color * 255 / 7);
        const ceil = Math.ceil(color * 255 / 7);
        
        log(`${color}\t${round}\t${floor}\t${ceil}`);
    }
    
    log("\n8-bit → 3-bit Conversion:");
    log("8-bit\tMath.round\tMath.floor\tMath.ceil");
    log("-----------------------------------");
    
    for (let i = 0; i <= 255; i += 32) {
        const round = Math.min(7, Math.round(i * 7 / 255));
        const floor = Math.min(7, Math.floor(i * 7 / 255));
        const ceil = Math.min(7, Math.ceil(i * 7 / 255));
        
        log(`${i}\t${round}\t${floor}\t${ceil}`);
    }
}

// Run all tests
function runAllTests() {
    log("COMPREHENSIVE COLOR CONVERSION TEST");
    log("====================================");
    log("Testing color conversion between various methods used in JIM-to-BMP tools");
    log("Generated: " + new Date().toISOString());
    
    testScaleFactors();
    compareImplementations();
    testRGBRoundTrip();
    testGenesisRoundTrip();
    evaluateRoundingMethods();
    
    log("\n=== SUMMARY ===");
    log("The 255/7 scaling factor is mathematically correct for 3-bit to 8-bit color conversion.");
    log("The 36.428 factor is an approximation of 255/7 = 36.4285...");
    log("The 32 factor used in the original extractJimFull.js produces darker colors (max 224 instead of 255).");
    log("\nRecommendation: Use Math.round(color * 255 / 7) for both extractJimFull.js and rebuildJim.js");
    log("for consistent and mathematically correct color conversion.");
}

runAllTests();

// Write output to file
writeFileSync('comprehensive-color-test-results.txt', output);
console.log("Test completed. Results saved to comprehensive-color-test-results.txt");
