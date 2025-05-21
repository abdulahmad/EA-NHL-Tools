import fs from 'fs';
import path from 'path';

function readBMPData(filePath) {
    console.log(`Reading BMP file: ${filePath}`);
    const data = fs.readFileSync(filePath);
    
    // Read header information
    const fileType = data.toString('ascii', 0, 2);
    const fileSize = data.readUInt32LE(2);
    const pixelOffset = data.readUInt32LE(10);
    const width = data.readInt32LE(18);
    const height = Math.abs(data.readInt32LE(22)); // Absolute value to handle top-down BMPs
    const bpp = data.readUInt16LE(28);
    
    console.log(`BMP Info: ${width}x${height}, ${bpp} bpp, Pixel offset: ${pixelOffset}`);
    
    // Read palette if it's an indexed color image
    const palette = [];
    if (bpp <= 8) {
        const numColors = Math.min(1 << bpp, 256);
        const headerSize = data.readUInt32LE(14);
        const paletteOffset = 14 + headerSize;
        
        console.log(`Reading palette with ${numColors} colors from offset ${paletteOffset}`);
        
        for (let i = 0; i < numColors; i++) {
            const blue = data[paletteOffset + i * 4];
            const green = data[paletteOffset + i * 4 + 1];
            const red = data[paletteOffset + i * 4 + 2];
            palette.push([red, green, blue]);
        }
    }
    
    // Read pixel data for 8bpp indexed images
    let pixels = [];
    if (bpp === 8) {
        const rowSize = Math.floor((width * bpp + 31) / 32) * 4;
        const topDown = data.readInt32LE(22) < 0;
        
        for (let y = 0; y < height; y++) {
            const row = topDown ? y : (height - 1 - y);
            const rowOffset = pixelOffset + row * rowSize;
            
            for (let x = 0; x < width; x++) {
                pixels.push(data[rowOffset + x]);
            }
        }
    }
    
    return { width, height, bpp, palette, pixels };
}

function compareImages(originalImg, extractedImg) {
    // Check dimensions
    if (originalImg.width !== extractedImg.width || originalImg.height !== extractedImg.height) {
        console.log(`Dimension mismatch: ${originalImg.width}x${originalImg.height} vs ${extractedImg.width}x${extractedImg.height}`);
        return false;
    }
    
    // Count palette differences
    let paletteDiffs = 0;
    const paletteComparison = [];
    for (let i = 0; i < Math.min(originalImg.palette.length, extractedImg.palette.length); i++) {
        const color1 = originalImg.palette[i];
        const color2 = extractedImg.palette[i];
        
        // Check if colors match
        if (color1[0] !== color2[0] || color1[1] !== color2[1] || color1[2] !== color2[2]) {
            paletteDiffs++;
            paletteComparison.push({
                index: i,
                original: color1,
                extracted: color2
            });
        }
    }
      console.log(`Found ${paletteDiffs} palette differences out of ${Math.min(originalImg.palette.length, extractedImg.palette.length)} colors`);
    
    // Analyze palette differences to understand the mapping
    if (paletteDiffs > 0) {
        console.log("\nDetailed palette differences:");
        const topDifferences = paletteComparison
            .map(diff => {
                const orig = diff.original;
                const extr = diff.extracted;
                const totalDiff = 
                    Math.abs(orig[0] - extr[0]) + 
                    Math.abs(orig[1] - extr[1]) + 
                    Math.abs(orig[2] - extr[2]);
                return { ...diff, totalDiff };
            })
            .sort((a, b) => b.totalDiff - a.totalDiff)
            .slice(0, 10);
            
        for (const diff of topDifferences) {
            console.log(`  Index ${diff.index}: Original RGB(${diff.original[0]}, ${diff.original[1]}, ${diff.original[2]}) -> Extracted RGB(${diff.extracted[0]}, ${diff.extracted[1]}, ${diff.extracted[2]}) (Diff: ${diff.totalDiff})`);
        }
        
        // Check if palette is just shifted
        const isPaletteShifted = checkForPaletteShift(originalImg.palette, extractedImg.palette);
        if (isPaletteShifted.isShifted) {
            console.log(`\nPalette appears to be shifted by ${isPaletteShifted.shift} positions`);
        }
    }
    
    // Count pixel differences and analyze by region
    let pixelDiffs = 0;
    const height = originalImg.height;
    const regionSize = Math.floor(height / 3);
    const regionDiffs = [0, 0, 0]; // top, middle, bottom
    
    for (let i = 0; i < originalImg.pixels.length; i++) {
        if (originalImg.pixels[i] !== extractedImg.pixels[i]) {
            pixelDiffs++;
            
            // Calculate which region this pixel is in
            const y = Math.floor(i / originalImg.width);
            const region = Math.floor(y / regionSize);
            if (region < 3) {
                regionDiffs[region]++;
            }
        }
    }
    
    console.log(`Found ${pixelDiffs} pixel differences out of ${originalImg.pixels.length} pixels`);
    console.log(`Differences by region: Top: ${regionDiffs[0]}, Middle: ${regionDiffs[1]}, Bottom: ${regionDiffs[2]}`);
    
    return {
        paletteDifferences: paletteComparison,
        pixelDifferences: pixelDiffs,
        regionDifferences: regionDiffs
    };
}

function generateDifferenceImage(originalImg, extractedImg, outputPath) {
    if (originalImg.width !== extractedImg.width || originalImg.height !== extractedImg.height) {
        console.log("Cannot generate difference image for images with different dimensions");
        return;
    }
    
    // Create a new 8bpp BMP file with red pixels where there are differences
    const width = originalImg.width;
    const height = originalImg.height;
    const headerSize = 54; // 14 byte BMP header + 40 byte DIB header
    const paletteSize = 256 * 4; // 256 colors * 4 bytes (BGRA)
    const rowSize = Math.ceil(width / 4) * 4; // 4-byte aligned rows
    const pixelDataSize = rowSize * height;
    const fileSize = headerSize + paletteSize + pixelDataSize;
    
    const buffer = Buffer.alloc(fileSize);
    
    // BMP Header (14 bytes)
    buffer.write('BM', 0); // Magic number
    buffer.writeUInt32LE(fileSize, 2); // File size
    buffer.writeUInt32LE(0, 6); // Reserved
    buffer.writeUInt32LE(headerSize + paletteSize, 10); // Pixel data offset
    
    // DIB Header (40 bytes)
    buffer.writeUInt32LE(40, 14); // DIB header size
    buffer.writeInt32LE(width, 18); // Width
    buffer.writeInt32LE(-height, 22); // Height (negative for top-down)
    buffer.writeUInt16LE(1, 26); // Color planes
    buffer.writeUInt16LE(8, 28); // Bits per pixel (8bpp)
    buffer.writeUInt32LE(0, 30); // No compression
    buffer.writeUInt32LE(pixelDataSize, 34); // Image size
    buffer.writeUInt32LE(0, 38); // Horizontal resolution
    buffer.writeUInt32LE(0, 42); // Vertical resolution
    buffer.writeUInt32LE(0, 46); // Colors in palette (0 = 2^n)
    buffer.writeUInt32LE(0, 50); // Important colors (0 = all)
    
    // Palette (256 * 4 bytes)
    // Index 0: Black
    buffer.writeUInt8(0, 54); // Blue
    buffer.writeUInt8(0, 55); // Green
    buffer.writeUInt8(0, 56); // Red
    buffer.writeUInt8(0, 57); // Alpha
    
    // Index 1: Red
    buffer.writeUInt8(0, 58); // Blue
    buffer.writeUInt8(0, 59); // Green
    buffer.writeUInt8(255, 60); // Red
    buffer.writeUInt8(0, 61); // Alpha
    
    // Fill remaining palette with grayscale values
    for (let i = 2; i < 256; i++) {
        const gray = Math.min(255, i);
        buffer.writeUInt8(gray, 54 + i * 4); // Blue
        buffer.writeUInt8(gray, 55 + i * 4); // Green
        buffer.writeUInt8(gray, 56 + i * 4); // Red
        buffer.writeUInt8(0, 57 + i * 4); // Alpha
    }
    
    // Pixel data
    const pixelOffset = headerSize + paletteSize;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const isDifferent = originalImg.pixels[i] !== extractedImg.pixels[i] ? 1 : 0;
            buffer.writeUInt8(isDifferent, pixelOffset + y * rowSize + x);
        }
        
        // Pad row to 4 bytes
        for (let x = width; x < rowSize; x++) {
            buffer.writeUInt8(0, pixelOffset + y * rowSize + x);
        }
    }
    
    fs.writeFileSync(outputPath, buffer);
    console.log(`Difference image saved to ${outputPath}`);
}

// Check for command-line arguments
if (process.argv.length < 4) {
    console.log('Usage: node simple-bmp-compare.js <original-bmp> <extracted-bmp>');
    process.exit(1);
}

/**
 * Check if the palette is just shifted by some offset
 * @param {Array} palette1 - First palette
 * @param {Array} palette2 - Second palette
 * @returns {Object} - Analysis result
 */
function checkForPaletteShift(palette1, palette2) {
    // Only analyze palettes of the same size
    if (palette1.length !== palette2.length) {
        return { isShifted: false, shift: 0 };
    }
    
    const length = palette1.length;
    const possibleShifts = [];
    
    // Try all possible shifts
    for (let shift = 0; shift < length; shift++) {
        let matchCount = 0;
        for (let i = 0; i < length; i++) {
            const color1 = palette1[i];
            const color2 = palette2[(i + shift) % length];
            
            if (color1[0] === color2[0] && color1[1] === color2[1] && color1[2] === color2[2]) {
                matchCount++;
            }
        }
        
        if (matchCount > 0) {
            possibleShifts.push({ shift, matchCount });
        }
    }
    
    // Find the best shift
    if (possibleShifts.length === 0) {
        return { isShifted: false, shift: 0 };
    }
    
    const bestShift = possibleShifts.sort((a, b) => b.matchCount - a.matchCount)[0];
    return { 
        isShifted: bestShift.matchCount >= length * 0.3, // At least 30% match
        shift: bestShift.shift,
        matchCount: bestShift.matchCount,
        totalColors: length
    };
}

/**
 * Analyze noisy regions in the image
 * @param {Object} originalImg - Original image data
 * @param {Object} extractedImg - Extracted image data
 * @returns {Object} Analysis of noisy regions
 */
function analyzeNoisyRegions(originalImg, extractedImg) {
    const width = originalImg.width;
    const height = originalImg.height;
    const noisyRows = new Array(height).fill(0);
    const noisyColumns = new Array(width).fill(0);
    
    // Count differences by row and column
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            if (originalImg.pixels[i] !== extractedImg.pixels[i]) {
                noisyRows[y]++;
                noisyColumns[x]++;
            }
        }
    }
    
    // Find the most noisy rows
    const topNoisyRows = noisyRows.map((count, index) => ({ row: index, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .filter(row => row.count > width * 0.1); // At least 10% of the row is different
    
    // Find the most noisy columns
    const topNoisyColumns = noisyColumns.map((count, index) => ({ column: index, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .filter(col => col.count > height * 0.1); // At least 10% of the column is different
    
    // Find contiguous noisy row ranges
    const noisyRowRanges = [];
    let startRow = -1;
    for (let y = 0; y < height; y++) {
        if (noisyRows[y] > width * 0.1) { // More than 10% different
            if (startRow === -1) startRow = y;
        } else {
            if (startRow !== -1) {
                noisyRowRanges.push({ start: startRow, end: y - 1, length: y - startRow });
                startRow = -1;
            }
        }
    }
    if (startRow !== -1) {
        noisyRowRanges.push({ start: startRow, end: height - 1, length: height - startRow });
    }
    
    return {
        topNoisyRows,
        topNoisyColumns,
        noisyRowRanges
    };
}

// Get file paths from command-line arguments
const originalPath = process.argv[2];
const extractedPath = process.argv[3];

// Create output directory
const outputDir = path.join(path.dirname(extractedPath), 'comparison');
try {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
} catch (err) {
    console.error(`Error creating directory ${outputDir}:`, err);
}

// console.log('aa test0', originalPath, extractedPath);
// Read and compare images
const originalImg = readBMPData(originalPath);
const extractedImg = readBMPData(extractedPath);
// console.log('aa test', originalImg, extractedImg)
const result = compareImages(originalImg, extractedImg);

// Generate difference image
const diffImagePath = path.join(outputDir, 'differences.bmp');
generateDifferenceImage(originalImg, extractedImg, diffImagePath);

// Analyze noisy regions
console.log("\n=== NOISY REGION ANALYSIS ===");
const noiseAnalysis = analyzeNoisyRegions(originalImg, extractedImg);

if (noiseAnalysis.noisyRowRanges.length > 0) {
    console.log("Noisy row ranges (contiguous rows with significant differences):");
    noiseAnalysis.noisyRowRanges.forEach(range => {
        console.log(`  Rows ${range.start}-${range.end} (${range.length} rows, ${Math.round(range.start / originalImg.height * 100)}% - ${Math.round(range.end / originalImg.height * 100)}% of image height)`);
    });
}

if (noiseAnalysis.topNoisyRows.length > 0) {
    console.log("\nTop noisy rows:");
    noiseAnalysis.topNoisyRows.slice(0, 5).forEach(row => {
        console.log(`  Row ${row.row} (${Math.round(row.row / originalImg.height * 100)}% from top): ${row.count} different pixels (${Math.round(row.count / originalImg.width * 100)}% of row width)`);
    });
}

// Check for potential palette index issues in tiles
console.log("\n=== PALETTE INDEX ANALYSIS ===");
const tileSize = 8; // 8x8 tiles
const potentialTileMappingIssues = [];

// Analyze each 8x8 tile
for (let ty = 0; ty < Math.floor(originalImg.height / tileSize); ty++) {
    for (let tx = 0; tx < Math.floor(originalImg.width / tileSize); tx++) {
        let tileDiffCount = 0;
        let originalIndices = new Set();
        let extractedIndices = new Set();
        
        for (let y = 0; y < tileSize; y++) {
            for (let x = 0; x < tileSize; x++) {
                const i = (ty * tileSize + y) * originalImg.width + (tx * tileSize + x);
                if (originalImg.pixels[i] !== extractedImg.pixels[i]) {
                    tileDiffCount++;
                }
                originalIndices.add(originalImg.pixels[i]);
                extractedIndices.add(extractedImg.pixels[i]);
            }
        }
        
        // If this tile has many differences but similar color count, might be palette index issue
        if (tileDiffCount > tileSize * tileSize * 0.5 && 
            Math.abs(originalIndices.size - extractedIndices.size) <= 2) {
            potentialTileMappingIssues.push({
                tile: { x: tx, y: ty },
                diffCount: tileDiffCount,
                originalIndices: originalIndices.size,
                extractedIndices: extractedIndices.size
            });
        }
    }
}

if (potentialTileMappingIssues.length > 0) {
    console.log(`Found ${potentialTileMappingIssues.length} tiles with potential palette index mapping issues:`);
    potentialTileMappingIssues.slice(0, 10).forEach(tile => {
        console.log(`  Tile at (${tile.tile.x}, ${tile.tile.y}): ${tile.diffCount} different pixels, original indices: ${tile.originalIndices}, extracted indices: ${tile.extractedIndices}`);
    });
    
    // Calculate which rows have the most problematic tiles
    const rowCounts = {};
    potentialTileMappingIssues.forEach(tile => {
        const row = tile.tile.y;
        rowCounts[row] = (rowCounts[row] || 0) + 1;
    });
    
    const problematicRows = Object.entries(rowCounts)
        .map(([row, count]) => ({ row: parseInt(row), count }))
        .sort((a, b) => b.count - a.count);
    
    console.log("\nMost problematic rows (by tile count):");
    problematicRows.slice(0, 5).forEach(row => {
        console.log(`  Row ${row.row} (${Math.round(row.row * tileSize / originalImg.height * 100)}% from top): ${row.count} problematic tiles`);
    });
}

// Save comparison results
const resultPath = path.join(outputDir, 'comparison-results.json');
fs.writeFileSync(resultPath, JSON.stringify({
    ...result,
    noiseAnalysis,
    potentialTileMappingIssues: potentialTileMappingIssues ? potentialTileMappingIssues.length : 0
}, null, 2));
console.log(`Comparison results saved to ${resultPath}`);

// Print summary
console.log("\n=== SUMMARY ===");
if (result.pixelDifferences === 0) {
    console.log("The images are identical! All issues have been fixed.");
} else {
    // Calculate percentage of differences
    const totalPixels = originalImg.width * originalImg.height;
    const diffPercentage = (result.pixelDifferences / totalPixels) * 100;
    console.log(`Differences found: ${diffPercentage.toFixed(2)}% of the image`);
    
    if (result.regionDifferences[0] > result.regionDifferences[1] && result.regionDifferences[0] > result.regionDifferences[2]) {
        console.log("The top third still has more differences than other regions.");
    } else {
        console.log("Differences are more evenly distributed now.");
    }
}
