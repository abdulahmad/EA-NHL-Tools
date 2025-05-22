// test-color-conversion.js
// Test script to compare color conversion between rebuildJim.js and extractJimFull.js
import { writeFileSync } from 'fs';
let output = "";

// Helper function to log to both console and output string
function log(str) {
    console.log(str);
    output += str + "\n";
}

// From rebuildJim.js
function RGBToGenesisColor(r, g, b) {
    // Convert from 8-bit (0-255) to 3-bit (0-7)
    const r3 = Math.min(7, Math.round(r / 36.428));
    const g3 = Math.min(7, Math.round(g / 36.428));
    const b3 = Math.min(7, Math.round(b / 36.428));

    // Pack into 16-bit genesis format (0000BBB0GGG0RRR0)
    return ((b3 & 0x07) << 9) | ((g3 & 0x07) << 5) | ((r3 & 0x07) << 1);
}

// From extractJimFull.js - Original
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

// From extractJimFull.js - Modified
function genesisColorToRGB_Modified(word) {
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

// Another approach - exact multiples
function genesisColorToRGB_Exact(word) {
    const blue = (word >> 9) & 0x07;  // Bits 9-11
    const green = (word >> 5) & 0x07; // Bits 5-7
    const red = (word >> 1) & 0x07;   // Bits 1-3

    // Scale exactly: 0->0, 1->36, 2->73, 3->109, 4->146, 5->182, 6->219, 7->255
    return [
        Math.round(red * 255 / 7),
        Math.round(green * 255 / 7),
        Math.round(blue * 255 / 7)
    ];
}

// Test roundtrip conversion
function testRoundtrip() {
    log("Testing roundtrip color conversion...");
    log("Original RGB -> Genesis -> RGB (Original) -> Genesis");
    log("R\tG\tB\t->\tGenesis\t->\tR'\tG'\tB'\t->\tGenesis'");
    log("-----------------------------------------------------------");
    
    // Test some sample colors
    const testColors = [
        [0, 0, 0],      // Black
        [255, 0, 0],    // Red
        [0, 255, 0],    // Green
        [0, 0, 255],    // Blue
        [255, 255, 0],  // Yellow
        [255, 0, 255],  // Magenta
        [0, 255, 255],  // Cyan
        [255, 255, 255],// White
        [128, 128, 128],// Gray
        [192, 64, 32],  // Arbitrary color
    ];
    
    for (const [r, g, b] of testColors) {
        // First conversion: RGB -> Genesis
        const genesisColor = RGBToGenesisColor(r, g, b);
        
        // Original method
        const [r1, g1, b1] = genesisColorToRGB_Original(genesisColor);
        const genesisColor1 = RGBToGenesisColor(r1, g1, b1);
        
        // Modified method
        const [r2, g2, b2] = genesisColorToRGB_Modified(genesisColor);
        const genesisColor2 = RGBToGenesisColor(r2, g2, b2);
        
        // Exact method
        const [r3, g3, b3] = genesisColorToRGB_Exact(genesisColor);
        const genesisColor3 = RGBToGenesisColor(r3, g3, b3);
        
        log(`Original: ${r},${g},${b} -> ${genesisColor.toString(16).toUpperCase().padStart(4, '0')} -> ${r1},${g1},${b1} -> ${genesisColor1.toString(16).toUpperCase().padStart(4, '0')} ${genesisColor === genesisColor1 ? '✓' : '✗'}`);
        log(`Modified: ${r},${g},${b} -> ${genesisColor.toString(16).toUpperCase().padStart(4, '0')} -> ${r2},${g2},${b2} -> ${genesisColor2.toString(16).toUpperCase().padStart(4, '0')} ${genesisColor === genesisColor2 ? '✓' : '✗'}`);
        log(`Exact:    ${r},${g},${b} -> ${genesisColor.toString(16).toUpperCase().padStart(4, '0')} -> ${r3},${g3},${b3} -> ${genesisColor3.toString(16).toUpperCase().padStart(4, '0')} ${genesisColor === genesisColor3 ? '✓' : '✗'}`);
        log("-----------------------------------------------------------");
    }
}

// Test the actual scale factor
function testScaleFactor() {
    log("\nTesting scale factors...");
    log("3-bit\t*32\t*36.428\t*(255/7)");
    log("-----------------------------------");
    
    for (let i = 0; i <= 7; i++) {
        const scale32 = i * 32;
        const scale36 = Math.round(i * 36.428);
        const scaleExact = Math.round(i * 255 / 7);
        log(`${i}\t${scale32}\t${scale36}\t${scaleExact}`);
    }
}

testRoundtrip();
testScaleFactor();

// Write output to file
writeFileSync('color-test-results.txt', output);
