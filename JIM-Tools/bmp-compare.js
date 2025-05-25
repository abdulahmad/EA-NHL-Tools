const fs = require('fs');
const path = require('path');

// Read a BMP file and extract its header information, palette, and pixel data
function readBMPFile(filePath) {
    console.log(`Reading BMP file: ${filePath}`);
    const buffer = fs.readFileSync(filePath);
    
    // Read BMP header
    const fileSize = buffer.readUInt32LE(2);
    const pixelOffset = buffer.readUInt32LE(10);
    const dibHeaderSize = buffer.readUInt32LE(14);
    const width = buffer.readInt32LE(18);
    const height = Math.abs(buffer.readInt32LE(22)); // Handle negative height (top-down)
    const bitsPerPixel = buffer.readUInt16LE(28);
    
    console.log(`BMP dimensions: ${width}x${height}, ${bitsPerPixel} bits per pixel`);
    console.log(`Pixel data offset: ${pixelOffset}, File size: ${fileSize}`);
    
    // Read palette if it's an indexed color image
    let palette = [];
    if (bitsPerPixel <= 8) {
        const numColors = Math.min(1 << bitsPerPixel, 256);
        const paletteOffset = 14 + dibHeaderSize;
        
        for (let i = 0; i < numColors; i++) {
            const blue = buffer[paletteOffset + i * 4];
            const green = buffer[paletteOffset + i * 4 + 1];
            const red = buffer[paletteOffset + i * 4 + 2];
            palette.push([red, green, blue]);
        }
        
        console.log(`Palette size: ${palette.length} colors`);
    }
    
    // Read pixel data for 8-bit indexed color
    const pixels = [];
    const topDown = buffer.readInt32LE(22) < 0; // Negative height indicates top-down ordering
    
    if (bitsPerPixel === 8) {
        // Calculate row size (must be multiple of 4 bytes)
        const rowSize = Math.floor((width * bitsPerPixel + 31) / 32) * 4;
        
        for (let y = 0; y < height; y++) {
            // If BMP is bottom-up, we need to read rows in reverse
            const row = topDown ? y : (height - 1 - y);
            const rowOffset = pixelOffset + row * rowSize;
            
            for (let x = 0; x < width; x++) {
                const pixel = buffer[rowOffset + x];
                pixels.push(pixel);
            }
        }
    }
    
    return {
        width,
        height,
        bitsPerPixel,
        palette,
        pixels
    };
}

// Compare two BMP files
function compareBMPs(bmp1, bmp2) {
    console.log("\nComparing BMP files:");
    
    // Compare dimensions
    if (bmp1.width !== bmp2.width || bmp1.height !== bmp2.height) {
        console.log(`Dimension mismatch: ${bmp1.width}x${bmp1.height} vs ${bmp2.width}x${bmp2.height}`);
        return;
    }
    
    // Compare bit depth
    if (bmp1.bitsPerPixel !== bmp2.bitsPerPixel) {
        console.log(`Bit depth mismatch: ${bmp1.bitsPerPixel} vs ${bmp2.bitsPerPixel}`);
    }
    
    // Compare palettes
    if (bmp1.palette.length > 0 && bmp2.palette.length > 0) {
        // Count palette differences
        let paletteDiffCount = 0;
        const paletteDiffs = [];
        
        // Find color differences between palettes
        for (let i = 0; i < Math.min(bmp1.palette.length, bmp2.palette.length); i++) {
            const color1 = bmp1.palette[i];
            const color2 = bmp2.palette[i];
            
            if (color1[0] !== color2[0] || color1[1] !== color2[1] || color1[2] !== color2[2]) {
                paletteDiffCount++;
                paletteDiffs.push({
                    index: i,
                    color1: color1,
                    color2: color2
                });
            }
        }
        
        console.log(`Found ${paletteDiffCount} palette color differences`);
        
        // Log the first 10 palette differences
        if (paletteDiffs.length > 0) {
            console.log("\nSample palette differences:");
            const samplesToShow = Math.min(paletteDiffs.length, 10);
            for (let i = 0; i < samplesToShow; i++) {
                const diff = paletteDiffs[i];
                console.log(`Index ${diff.index}: RGB(${diff.color1[0]},${diff.color1[1]},${diff.color1[2]}) -> RGB(${diff.color2[0]},${diff.color2[1]},${diff.color2[2]})`);
            }
        }
    }
    
    // Compare pixels
    if (bmp1.pixels.length === bmp2.pixels.length) {
        let pixelDiffCount = 0;
        
        // Group differences by region to see patterns
        const regionSize = Math.floor(bmp1.height / 3); // Divide into three regions
        const regionDiffs = [0, 0, 0]; // Count differences in each third of the image
        
        for (let i = 0; i < bmp1.pixels.length; i++) {
            if (bmp1.pixels[i] !== bmp2.pixels[i]) {
                pixelDiffCount++;
                
                // Calculate position in image
                const x = i % bmp1.width;
                const y = Math.floor(i / bmp1.width);
                
                // Determine which region this pixel belongs to
                const region = Math.floor(y / regionSize);
                if (region < 3) regionDiffs[region]++;
            }
        }
        
        console.log(`\nFound ${pixelDiffCount} pixel differences out of ${bmp1.pixels.length} pixels (${(pixelDiffCount / bmp1.pixels.length * 100).toFixed(2)}%)`);
        console.log(`Differences by region: Top third: ${regionDiffs[0]}, Middle third: ${regionDiffs[1]}, Bottom third: ${regionDiffs[2]}`);
    } else {
        console.log(`Pixel count mismatch: ${bmp1.pixels.length} vs ${bmp2.pixels.length}`);
    }
}

// Analyze Genesis color conversion
function analyzeGenesisColorConversion() {
    console.log("\nAnalyzing Genesis color conversion functions:");
    
    // Conversion functions from the scripts
    function rgbToGenesis1(r, g, b) {
        // From genesis-color-reduce.js
        r = Math.round(r / 32) & 0x07;
        g = Math.round(g / 32) & 0x07;
        b = Math.round(b / 32) & 0x07;
        return ((b & 0x7) << 9) | ((g & 0x7) << 5) | ((r & 0x7) << 1);
    }
    
    function rgbToGenesis2(r, g, b) {
        // From rebuildJim.js (fixed version)
        r = Math.round(r / 32) & 0x07;
        g = Math.round(g / 32) & 0x07;
        b = Math.round(b / 32) & 0x07;
        return ((b << 9) | (g << 5) | (r << 1));
    }
    
    function genesisToRGB(word) {
        // From extractJimFull.js
        const blue = (word >> 9) & 0x07;  // Bits 9-11
        const green = (word >> 5) & 0x07; // Bits 5-7
        const red = (word >> 1) & 0x07;   // Bits 1-3
        
        // Scale from 3-bit (0-7) to 8-bit (0-255)
        return [red * 32, green * 32, blue * 32];
    }
    
    // Test colors
    const testColors = [
        [0, 0, 0],      // Black
        [255, 0, 0],    // Red
        [0, 255, 0],    // Green
        [0, 0, 255],    // Blue
        [255, 255, 255], // White
        [128, 128, 128], // Gray
        [128, 0, 0],    // Dark red
        [0, 128, 0],    // Dark green
        [0, 0, 128]     // Dark blue
    ];
    
    console.log("Testing color conversion with sample colors:");
    testColors.forEach(([r, g, b]) => {
        const genesis1 = rgbToGenesis1(r, g, b);
        const genesis2 = rgbToGenesis2(r, g, b);
        const roundTrip1 = genesisToRGB(genesis1);
        
        console.log(`RGB(${r},${g},${b}) -> Genesis1: 0x${genesis1.toString(16)} -> RGB(${roundTrip1[0]},${roundTrip1[1]},${roundTrip1[2]})`);
        
        if (genesis1 !== genesis2) {
            console.log(`  INCONSISTENCY DETECTED: Genesis2 value is 0x${genesis2.toString(16)}`);
        }
    });
}

// Main function
function main() {
    if (process.argv.length < 4) {
        console.log('Usage: node bmp-compare.js <original-bmp> <extracted-bmp>');
        process.exit(1);
    }

    const originalPath = process.argv[2];
    const extractedPath = process.argv[3];

    // Read both BMP files
    const originalBmp = readBMPFile(originalPath);
    const extractedBmp = readBMPFile(extractedPath);

    // Compare the files
    compareBMPs(originalBmp, extractedBmp);

    // Analyze Genesis color conversion
    analyzeGenesisColorConversion();
    
    console.log("\n============ SUMMARY RECOMMENDATIONS ============");
    console.log("Based on the analysis, check the following:");
    console.log("1. Ensure RGB to Genesis color conversion is consistent across all scripts");
    console.log("2. Check the palette mapping in extractJimFull.js - make sure it's correctly reading the palette from the JIM file");
    console.log("3. Verify tile mapping in the top part of the image, as this may be where most differences occur");
}

main();
