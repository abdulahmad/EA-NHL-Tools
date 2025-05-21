const fs = require('fs');
const path = require('path');
const { readFileSync, writeFileSync, mkdirSync, existsSync } = fs;
const { join, dirname } = path;

/**
 * Read a BMP file and extract its header information, palette, and pixel data
 * @param {string} filePath - Path to the BMP file
 * @returns {Object} BMP file information
 */
function readBMPFile(filePath) {
    console.log(`Reading BMP file: ${filePath}`);
    const buffer = readFileSync(filePath);
    
    // Read BMP header
    const fileSize = buffer.readUInt32LE(2);
    const pixelOffset = buffer.readUInt32LE(10);
    const dibHeaderSize = buffer.readUInt32LE(14);
    const width = buffer.readInt32LE(18);
    const height = Math.abs(buffer.readInt32LE(22)); // Handle negative height (top-down)
    const bitsPerPixel = buffer.readUInt16LE(28);
    const compression = buffer.readUInt32LE(30);
    
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
            // Alpha is at paletteOffset + i * 4 + 3, but we don't need it
            palette.push([red, green, blue]);
        }
        
        console.log(`Palette size: ${palette.length} colors`);
    }
    
    // Read pixel data
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
        pixels,
        topDown,
        fileSize,
        pixelOffset
    };
}

/**
 * Find differences between two BMP files
 * @param {Object} bmp1 - First BMP file data
 * @param {Object} bmp2 - Second BMP file data
 * @returns {Object} Differences between the files
 */
function compareBMPs(bmp1, bmp2) {
    const differences = {
        dimensions: bmp1.width !== bmp2.width || bmp1.height !== bmp2.height,
        bitsPerPixel: bmp1.bitsPerPixel !== bmp2.bitsPerPixel,
        paletteSize: bmp1.palette.length !== bmp2.palette.length,
        paletteDifferences: [],
        pixelDifferences: []
    };
    
    // Compare dimensions
    if (differences.dimensions) {
        console.log(`Dimension mismatch: ${bmp1.width}x${bmp1.height} vs ${bmp2.width}x${bmp2.height}`);
    }
    
    // Compare bit depth
    if (differences.bitsPerPixel) {
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
        differences.paletteDifferences = paletteDiffs;
    }
    
    // Compare pixels
    if (bmp1.pixels.length === bmp2.pixels.length) {
        let pixelDiffCount = 0;
        const pixelDiffs = [];
        
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
                
                // Record detailed diff info for the first few differences
                if (pixelDiffs.length < 100) {
                    pixelDiffs.push({
                        position: { x, y },
                        index1: bmp1.pixels[i],
                        index2: bmp2.pixels[i],
                        color1: bmp1.palette[bmp1.pixels[i]],
                        color2: bmp2.palette[bmp2.pixels[i]]
                    });
                }
            }
        }
        
        console.log(`Found ${pixelDiffCount} pixel differences out of ${bmp1.pixels.length} pixels`);
        console.log(`Differences by region: Top third: ${regionDiffs[0]}, Middle third: ${regionDiffs[1]}, Bottom third: ${regionDiffs[2]}`);
        
        differences.pixelDifferenceCount = pixelDiffCount;
        differences.pixelDifferences = pixelDiffs;
        differences.regionDifferences = regionDiffs;
    } else {
        console.log(`Pixel count mismatch: ${bmp1.pixels.length} vs ${bmp2.pixels.length}`);
    }
    
    return differences;
}

/**
 * Create a difference visualization image
 * @param {Object} bmp1 - First BMP file data
 * @param {Object} bmp2 - Second BMP file data
 * @param {string} outputPath - Path to save the visualization
 */
function createDiffVisualization(bmp1, bmp2, outputPath) {
    // Make sure the BMPs have the same dimensions
    if (bmp1.width !== bmp2.width || bmp1.height !== bmp2.height) {
        console.log("Cannot create visualization - images have different dimensions");
        return;
    }
    
    // Create a new BMP buffer
    const headerSize = 54; // 14 byte file header + 40 byte DIB header
    const paletteSize = 256 * 4; // 256 colors * 4 bytes (BGRA)
    const rowSize = Math.ceil(bmp1.width / 4) * 4; // Rows padded to multiple of 4 bytes
    const pixelDataSize = rowSize * bmp1.height;
    const fileSize = headerSize + paletteSize + pixelDataSize;
    
    const buffer = Buffer.alloc(fileSize);
    
    // BMP Header
    buffer.write('BM', 0); // Magic number
    buffer.writeUInt32LE(fileSize, 2); // File size
    buffer.writeUInt32LE(0, 6); // Reserved
    buffer.writeUInt32LE(headerSize + paletteSize, 10); // Pixel data offset
    
    // DIB Header
    buffer.writeUInt32LE(40, 14); // DIB header size
    buffer.writeInt32LE(bmp1.width, 18); // Width
    buffer.writeInt32LE(-bmp1.height, 22); // Height (negative for top-down)
    buffer.writeUInt16LE(1, 26); // Color planes
    buffer.writeUInt16LE(8, 28); // Bits per pixel (8 for indexed)
    buffer.writeUInt32LE(0, 30); // No compression
    buffer.writeUInt32LE(pixelDataSize, 34); // Image size
    buffer.writeUInt32LE(0, 38); // H-DPI
    buffer.writeUInt32LE(0, 42); // V-DPI
    buffer.writeUInt32LE(0, 46); // Colors in palette (0 = 2^n)
    buffer.writeUInt32LE(0, 50); // Important colors (0 = all)
    
    // Create a special palette for the diff image:
    // - Index 0: Black (for identical pixels)
    // - Index 1: Red (for different pixels)
    // - Copy the rest of the palette from bmp1
    let paletteOffset = 54;
    
    // Black for identical pixels
    buffer.writeUInt8(0, paletteOffset++); // Blue
    buffer.writeUInt8(0, paletteOffset++); // Green
    buffer.writeUInt8(0, paletteOffset++); // Red
    buffer.writeUInt8(0, paletteOffset++); // Alpha
    
    // Red for different pixels
    buffer.writeUInt8(0, paletteOffset++); // Blue
    buffer.writeUInt8(0, paletteOffset++); // Green
    buffer.writeUInt8(255, paletteOffset++); // Red
    buffer.writeUInt8(0, paletteOffset++); // Alpha
    
    // Copy the rest of the palette entries from bmp1
    for (let i = 2; i < 256; i++) {
        if (i < bmp1.palette.length) {
            buffer.writeUInt8(bmp1.palette[i][2], paletteOffset++); // Blue
            buffer.writeUInt8(bmp1.palette[i][1], paletteOffset++); // Green
            buffer.writeUInt8(bmp1.palette[i][0], paletteOffset++); // Red
            buffer.writeUInt8(0, paletteOffset++); // Alpha
        } else {
            buffer.writeUInt32LE(0, paletteOffset);
            paletteOffset += 4;
        }
    }
    
    // Write pixel data: 0 for identical, 1 for different
    const dataOffset = headerSize + paletteSize;
    for (let y = 0; y < bmp1.height; y++) {
        for (let x = 0; x < bmp1.width; x++) {
            const i = y * bmp1.width + x;
            const isDifferent = (bmp1.pixels[i] !== bmp2.pixels[i]) ? 1 : 0;
            buffer.writeUInt8(isDifferent, dataOffset + y * rowSize + x);
        }
        
        // Pad row to multiple of 4 bytes
        for (let x = bmp1.width; x < rowSize; x++) {
            buffer.writeUInt8(0, dataOffset + y * rowSize + x);
        }
    }
    
    writeFileSync(outputPath, buffer);
    console.log(`Diff visualization saved to ${outputPath}`);
}

/**
 * Generate a report of color palette differences
 * @param {Object} differences - Difference data from compareBMPs
 * @param {string} outputPath - Path to save the report
 */
function generatePaletteReport(differences, outputPath) {
    let report = "# Color Palette Differences Report\n\n";
    report += `Total palette differences: ${differences.paletteDifferences.length}\n\n`;
    
    report += "| Index | Original RGB | Extracted RGB | Difference |\n";
    report += "|-------|-------------|--------------|------------|\n";
    
    for (const diff of differences.paletteDifferences) {
        const color1 = diff.color1;
        const color2 = diff.color2;
        const rDiff = Math.abs(color1[0] - color2[0]);
        const gDiff = Math.abs(color1[1] - color2[1]);
        const bDiff = Math.abs(color1[2] - color2[2]);
        
        report += `| ${diff.index} | RGB(${color1[0]}, ${color1[1]}, ${color1[2]}) | RGB(${color2[0]}, ${color2[1]}, ${color2[2]}) | R:${rDiff} G:${gDiff} B:${bDiff} |\n`;
    }
    
    writeFileSync(outputPath, report);
    console.log(`Palette report saved to ${outputPath}`);
    
    // Also log some stats to the console
    if (differences.paletteDifferences.length > 0) {
        console.log("\nMost significant palette differences:");
        differences.paletteDifferences
            .map(diff => {
                const color1 = diff.color1;
                const color2 = diff.color2;
                const totalDiff = 
                    Math.abs(color1[0] - color2[0]) + 
                    Math.abs(color1[1] - color2[1]) + 
                    Math.abs(color1[2] - color2[2]);
                return { ...diff, totalDiff };
            })
            .sort((a, b) => b.totalDiff - a.totalDiff)
            .slice(0, 5)
            .forEach(diff => {
                console.log(`Index ${diff.index}: Original RGB(${diff.color1[0]}, ${diff.color1[1]}, ${diff.color1[2]}) -> Extracted RGB(${diff.color2[0]}, ${diff.color2[1]}, ${diff.color2[2]}) (Diff: ${diff.totalDiff})`);
            });
    }
}

/**
 * Analyze Genesis color conversion between the two files
 * @param {Object} bmp1 - First BMP file data
 * @param {Object} bmp2 - Second BMP file data
 * @returns {Object} Analysis of Genesis color conversion
 */
function analyzeGenesisColorConversion(bmp1, bmp2) {
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
    
    // Check for inconsistencies in the conversion functions
    const testColors = [
        [0, 0, 0],      // Black
        [255, 0, 0],    // Red
        [0, 255, 0],    // Green
        [0, 0, 255],    // Blue
        [255, 255, 255] // White
    ];
    
    const colorConversionResults = testColors.map(([r, g, b]) => {
        const genesis1 = rgbToGenesis1(r, g, b);
        const genesis2 = rgbToGenesis2(r, g, b);
        const roundTrip1 = genesisToRGB(genesis1);
        const roundTrip2 = genesisToRGB(genesis2);
        
        return {
            original: [r, g, b],
            genesis1Value: genesis1.toString(16),
            genesis2Value: genesis2.toString(16),
            roundTrip1,
            roundTrip2,
            conversionConsistent: genesis1 === genesis2
        };
    });
    
    // Check palette mapping between the files
    const paletteMappingAnalysis = [];
    for (let i = 0; i < Math.min(bmp1.palette.length, bmp2.palette.length); i++) {
        const color1 = bmp1.palette[i];
        const color2 = bmp2.palette[i];
        
        // Calculate the Genesis value for both colors
        const genesis1 = rgbToGenesis1(color1[0], color1[1], color1[2]);
        const genesis2 = rgbToGenesis1(color2[0], color2[1], color2[2]);
        
        paletteMappingAnalysis.push({
            index: i,
            original: color1,
            extracted: color2,
            originalGenesisValue: genesis1.toString(16),
            extractedGenesisValue: genesis2.toString(16),
            genesisValuesMatch: genesis1 === genesis2
        });
    }
    
    return {
        colorConversionResults,
        paletteMappingAnalysis
    };
}

// If run as a script
if (process.argv.length < 4) {
    console.log('Usage: node analyze-bmp-conversion.js <original-bmp> <extracted-bmp>');
    process.exit(1);
}

const originalPath = process.argv[2];
const extractedPath = process.argv[3];

// Create output directory if it doesn't exist
const outputDir = join(dirname(extractedPath), 'analysis');
const mkdirSync = (path) => {
    try {
        const fs = require('fs');
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path, { recursive: true });
        }
    } catch (err) {
        console.error(`Error creating directory ${path}:`, err);
    }
};
mkdirSync(outputDir);

// Read both BMP files
const originalBmp = readBMPFile(originalPath);
const extractedBmp = readBMPFile(extractedPath);

// Compare the files
console.log('\nComparing BMP files:');
const differences = compareBMPs(originalBmp, extractedBmp);

// Analyze Genesis color conversion
console.log('\nAnalyzing Genesis color conversion:');
const colorAnalysis = analyzeGenesisColorConversion(originalBmp, extractedBmp);

// Generate palette difference report
const paletteReportPath = join(outputDir, 'palette-differences.md');
generatePaletteReport(differences, paletteReportPath);

// Create difference visualization
const diffVisualizationPath = join(outputDir, 'differences.bmp');
createDiffVisualization(originalBmp, extractedBmp, diffVisualizationPath);

// Generate JSON report with all findings
const reportPath = join(outputDir, 'conversion-analysis.json');
const report = {
    originalBmpInfo: {
        width: originalBmp.width,
        height: originalBmp.height,
        bitsPerPixel: originalBmp.bitsPerPixel,
        paletteSize: originalBmp.palette.length
    },
    extractedBmpInfo: {
        width: extractedBmp.width,
        height: extractedBmp.height,
        bitsPerPixel: extractedBmp.bitsPerPixel,
        paletteSize: extractedBmp.palette.length
    },
    differences,
    colorAnalysis
};

writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\nFull analysis report saved to ${reportPath}`);
console.log(`Diff visualization saved to ${diffVisualizationPath}`);
console.log(`Palette report saved to ${paletteReportPath}`);

// Output summary recommendations
console.log('\n============ SUMMARY RECOMMENDATIONS ============');
if (differences.regionDifferences && differences.regionDifferences[0] > differences.regionDifferences[1] && differences.regionDifferences[0] > differences.regionDifferences[2]) {
    console.log('The top third of the image has the most differences, suggesting a potential issue with tile mapping or palette indexing in that region.');
}

if (differences.paletteDifferences.length > 0) {
    console.log(`Found ${differences.paletteDifferences.length} palette differences, which may indicate issues with the palette conversion between stages.`);
    console.log('Possible solutions:');
    console.log('1. Check if RGB to Genesis conversion is consistent across all scripts');
    console.log('2. Verify the ACT palette file is being read and written correctly');
    console.log('3. Ensure the palette indexing in the JIM file matches the original BMP');
}

if (colorAnalysis.colorConversionResults.some(r => !r.conversionConsistent)) {
    console.log('Inconsistent color conversion found between scripts! This is likely causing palette issues.');
    console.log('Make sure all scripts use the same RGB to Genesis color conversion formula.');
}
