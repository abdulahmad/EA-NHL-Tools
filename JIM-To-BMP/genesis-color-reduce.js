// genesis-color-reduce.js - Standalone color reduction script for Sega Genesis/Mega Drive graphics
// Handles any BMP format (24-bit, 8-bit, 4-bit, 1-bit) and uses quadrant-based color reduction
// Exports to structured output folder with metadata, reduced BMP, and individual tile files

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, basename, join } from 'path';
import { performance } from 'perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Process BMP file and reduce colors for Genesis/Mega Drive format
 * @param {string} inputPath - Path to the input BMP file
 * @param {Object} options - Options for color reduction
 * @returns {Object} Processing results
 */
function processBmp(inputPath, options = {}) {
    const startTime = performance.now();
    
    // Default options
    const opts = {
        balanceStrategy: options.balanceStrategy || 'count', // 'count', 'entropy', 'importance', 'area'
        optimizePalettes: options.optimizePalettes !== false,
        verbose: options.verbose !== false,
        outputDir: options.outputDir || null,
        palettes: options.palettes || [0, 1, 2, 3], // Default to all 4 palettes
        ...options
    };

    // Create output directory structure
    const inputFileName = basename(inputPath, '.bmp');
    const strategyName = opts.balanceStrategy;
    const palettesUsed = opts.palettes.join('-');
    
    // Default output directory is build/<filename>-<strategy>-<palettes>
    const outputDir = opts.outputDir || 
        join(__dirname, 'build', `${inputFileName}-${strategyName}-pal${palettesUsed}`);
    
    // Create directory structure
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }
    
    const tilesDir = join(outputDir, 'tiles');
    if (!existsSync(tilesDir)) {
        mkdirSync(tilesDir, { recursive: true });
    }
    
    // Output file paths
    const metadataPath = join(outputDir, 'metadata.json');
    const bmpOutputPath = join(outputDir, `${inputFileName}-reduced.bmp`);
    
    console.log(`Processing ${inputPath} with ${strategyName} balance strategy`);
    console.log(`Output directory: ${outputDir}`);
    
    // Read and process the BMP file
    const bmp = readBMP(inputPath);
      console.log(`BMP dimensions: ${bmp.width}x${bmp.height}, ${bmp.bpp} bits per pixel`);
    
    // Define quadrants based on selected palettes
    const quadrants = defineQuadrantsAndPalettes(bmp, opts);
    
    // Generate palettes for each palette index
    console.log('Creating palettes...');
    const palettes = [];

    // Initialize array for the number of required palettes (always 4 for Genesis)
    for (let i = 0; i < 4; i++) {
        palettes.push(null);
    }

    // Find which palette indices are actually used
    const usedPaletteIndices = new Set();
    for (const q of quadrants) {
        usedPaletteIndices.add(q.paletteIndex);
    }

    // Generate palettes only for the indices that are used
    for (const paletteIndex of usedPaletteIndices) {
        // Collect all regions using this palette
        const regionsWithThisPalette = quadrants.filter(q => q.paletteIndex === paletteIndex);
        console.log(`Generating palette ${paletteIndex} used by ${regionsWithThisPalette.length} regions`);
        
        // Collect colors from all regions using this palette
        const combinedColors = new Map();
        for (const region of regionsWithThisPalette) {
            const colors = findDominantColors(bmp.pixels, region.startX, region.startY, region.endX, region.endY, 64); // Get more colors initially
            for (const color of colors) {
                const key = `${color.r},${color.g},${color.b}`;
                if (!combinedColors.has(key)) {
                    combinedColors.set(key, { ...color });
                } else {
                    combinedColors.get(key).count += color.count;
                }
            }
        }
        
        // Convert combined colors to array and sort by frequency
        const colorArray = Array.from(combinedColors.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 16); // Take top 16 colors
        
        palettes[paletteIndex] = colorArray;
        console.log(`Palette ${paletteIndex} has ${colorArray.length} colors`);
    }

    // Fill in any unused palettes with a default palette if needed
    for (let i = 0; i < palettes.length; i++) {
        if (!palettes[i]) {
            console.log(`Palette ${i} is unused, creating default`);
            palettes[i] = [{ r: 0, g: 0, b: 0, count: 1 }]; // Default black
        }
    }
    
    // Optimize palettes if requested
    if (opts.optimizePalettes) {
        console.log('Optimizing palettes to improve color distribution...');
        // Get list of used palette indices
        const usedPaletteIndices = new Set();
        for (const q of quadrants) {
            usedPaletteIndices.add(q.paletteIndex);
        }
        
        // Only optimize the palettes that are actually used
        for (const paletteIndex of usedPaletteIndices) {
            console.log(`Optimizing palette ${paletteIndex}...`);
            const regionsUsingThisPalette = quadrants.filter(q => q.paletteIndex === paletteIndex);
            optimizePalette(palettes[paletteIndex], bmp.pixels, regionsUsingThisPalette);
        }
    }
    
    // Convert to Genesis color format for JSON output
    const genesisPalettes = palettes.map(palette => 
        palette.map(color => rgbToGenesis(color.r, color.g, color.b))
    );
    
    // Convert image to indexed color
    console.log('Converting image to indexed color...');
    const tileSize = 8;
    const tileAssignments = [];
    const indexedPixels = [];
    
    // Prepare flat pixel array for BMP output
    const flatPixels = new Array(bmp.width * bmp.height);
    
    // Create combined palette for the output BMP
    const combinedPalette = [];
    palettes.forEach(palette => {
        palette.forEach(color => {
            combinedPalette.push([color.r, color.g, color.b]);
        });
    });
    
    // Individual tile data for export
    const tileData = [];
    
    // Process the image tile by tile
    for (let ty = 0; ty < Math.ceil(bmp.height / tileSize); ty++) {
        const assignmentRow = [];
        const indexedRow = [];
        for (let tx = 0; tx < Math.ceil(bmp.width / tileSize); tx++) {
            // Determine which quadrant this tile belongs to
            let quadrantIndex = 0;
            const tileX = tx * tileSize;
            const tileY = ty * tileSize;
            
            // Find which quadrant this tile belongs to
            for (let i = 0; i < quadrants.length; i++) {
                const q = quadrants[i];
                if (tileX >= q.startX && tileX < q.endX && 
                    tileY >= q.startY && tileY < q.endY) {
                    quadrantIndex = i;
                    break;
                }
            }
            
            // Get the palette index for this quadrant
            const paletteIndex = quadrants[quadrantIndex].paletteIndex;
            
            // Get palette for this quadrant - FIX: use paletteIndex, not quadrantIndex
            const palette = palettes[paletteIndex];
            
            // Map pixels in this tile to the palette
            const tile = [];
            
            for (let y = 0; y < tileSize; y++) {
                for (let x = 0; x < tileSize; x++) {
                    const px = tx * tileSize + x;
                    const py = ty * tileSize + y;
                    
                    if (px < bmp.width && py < bmp.height) {
                        const pixel = bmp.pixels[py][px];
                        const colorIndex = findBestMatch(pixel, palette);
                        tile.push(colorIndex);
                        
                        // Convert to global palette index for the BMP
                        const globalIndex = paletteIndex * 16 + colorIndex;
                        flatPixels[py * bmp.width + px] = globalIndex;
                    } else {
                        // For pixels outside image bounds, use index 0 of this quadrant's palette
                        tile.push(0);
                    }
                }
            }
            
            indexedRow.push(tile);
            assignmentRow.push(quadrantIndex);
            
            // Save the individual tile data
            const tileInfo = {
                x: tx,
                y: ty,
                paletteIndex: paletteIndex,
                pixelData: [...tile] // Create a copy
            };
            
            tileData.push(tileInfo);
            
            // Save tile as a small BMP
            const tileFileName = `tile_${ty}_${tx}.bmp`;
            const tileFilePath = join(tilesDir, tileFileName);
            saveTileBMP(tileSize, tileSize, tile, palette, tileFilePath);
        }
        
        indexedPixels.push(indexedRow);
        tileAssignments.push(assignmentRow);
    }
    
    // Create color statistics
    const colorStats = calculateColorStats(tileData, palettes);

    // Create metadata compatible with bmpToJim script
    const metadata = {
        sourceFile: inputPath,
        width: bmp.width,
        height: bmp.height,
        bpp: bmp.bpp,
        format: bmp.format,
        tileWidth: Math.ceil(bmp.width / tileSize),
        tileHeight: Math.ceil(bmp.height / tileSize), 
        totalTiles: tileData.length,
        balanceStrategy: opts.balanceStrategy,
        optimizedPalettes: opts.optimizePalettes,
        selectedPalettes: opts.palettes,
        regions: quadrants.map((q, i) => ({
            index: i,
            paletteIndex: q.paletteIndex,
            bounds: {
                startX: q.startX,
                startY: q.startY,
                endX: q.endX,
                endY: q.endY
            }
        })),
        palettes: genesisPalettes.map((palette, index) => ({
            index,
            colors: palette.map(value => ({
                value,
                hex: genesisColorToHex(value),
                rgb: genesisColorToRgb(value)
            }))
        })),
        // Additional fields for bmpToJim compatibility
        palette: {
            format: "genesis", // Specify Sega Genesis palette format
            numPalettes: palettes.length,
            colorsPerPalette: 16,
            // Include raw palette data for easy access
            raw: palettes.map(pal => 
                pal.map(color => ({r: color.r, g: color.g, b: color.b}))
            )
        },
        // Add tile mapping information
        tiles: tileData.map(tile => ({
            x: tile.x,
            y: tile.y,
            paletteIndex: tile.paletteIndex,
            pixelData: tile.pixelData
        })),
        colorStats,
        tileAssignments,
        processingTime: {
            startTime: new Date().toISOString(),
            elapsedMs: performance.now() - startTime
        }
    };
    
    // Save metadata JSON
    console.log('Writing metadata...');
    try {
        // Ensure the JSON is properly formatted
        const metadataJson = JSON.stringify(metadata, null, 2);
        
        // Write with explicit UTF-8 encoding
        writeFileSync(metadataPath, metadataJson, { encoding: 'utf8' });
        console.log(`Metadata written to ${metadataPath}`);
    } catch (error) {
        console.error(`Error writing metadata: ${error.message}`);
        throw error;
    }

    // Save palette as Adobe Color Table (.act) file for JIM conversion compatibility
    console.log('Writing ACT palette file...');
    const actFilePath = join(outputDir, `${inputFileName}.act`);
    saveACTPalette(palettes, actFilePath);
    
    // Save reduced color BMP
    console.log('Writing reduced color BMP...');
    saveBMP(bmp.width, bmp.height, flatPixels, combinedPalette, bmpOutputPath);
    
    console.log('Processing complete!');
    
    return {
        metadata,
        outputDir,
        bmpOutputPath,
        tilesDir,
        actFilePath
    };
}

// Convert Genesis color value to hex string
function genesisColorToHex(value) {
    const r = (value >> 1) & 0x7;
    const g = (value >> 5) & 0x7;
    const b = (value >> 9) & 0x7;
    
    // Convert to 24-bit color approximation
    const r24 = Math.round((r / 7) * 255);
    const g24 = Math.round((g / 7) * 255);
    const b24 = Math.round((b / 7) * 255);
    
    return `#${r24.toString(16).padStart(2, '0')}${g24.toString(16).padStart(2, '0')}${b24.toString(16).padStart(2, '0')}`;
}

// Convert Genesis color value to RGB object
function genesisColorToRgb(value) {
    const r = (value >> 1) & 0x7;
    const g = (value >> 5) & 0x7;
    const b = (value >> 9) & 0x7;
    
    // Convert to 24-bit color approximation
    const r24 = Math.round((r / 7) * 255);
    const g24 = Math.round((g / 7) * 255);
    const b24 = Math.round((b / 7) * 255);
    
    return { r: r24, g: g24, b: b24 };
}

// Calculate color statistics
function calculateColorStats(tileData, palettes) {
    const stats = {
        paletteUsage: [0, 0, 0, 0],
        colorFrequency: [{}, {}, {}, {}],
        mostUsedColors: []
    };
    
    // Count palette usage
    for (const tile of tileData) {
        stats.paletteUsage[tile.paletteIndex]++;
        
        // Count color usage
        for (const colorIndex of tile.pixelData) {
            if (!stats.colorFrequency[tile.paletteIndex][colorIndex]) {
                stats.colorFrequency[tile.paletteIndex][colorIndex] = 0;
            }
            stats.colorFrequency[tile.paletteIndex][colorIndex]++;
        }
    }
    
    // Calculate percentage of palette usage
    const totalTiles = tileData.length;
    stats.palettePercentage = stats.paletteUsage.map(count => 
        Math.round((count / totalTiles) * 100)
    );
    
    // Find most used colors in each palette
    for (let i = 0; i < 4; i++) {
        const colorFreq = stats.colorFrequency[i];
        const sortedColors = Object.entries(colorFreq)
            .map(([index, count]) => ({ 
                paletteIndex: i, 
                colorIndex: parseInt(index), 
                count 
            }))
            .sort((a, b) => b.count - a.count);
        
        stats.mostUsedColors.push(sortedColors.slice(0, 5)); // Top 5 most used colors
    }
    
    return stats;
}

// Save a small BMP for an individual tile
function saveTileBMP(width, height, pixels, palette, filepath) {
    const headerSize = 14 + 40; // BMP header + DIB header
    const paletteSize = 16 * 4; // 16 colors * 4 bytes (BGRA)
    const rowSize = Math.ceil(width / 4) * 4; // Rows padded to multiple of 4 bytes
    const pixelDataSize = rowSize * height;
    const fileSize = headerSize + paletteSize + pixelDataSize;

    const bmp = Buffer.alloc(fileSize);

    // BMP Header
    bmp.write('BM', 0); // Magic number
    bmp.writeUInt32LE(fileSize, 2); // File size
    bmp.writeUInt32LE(0, 6); // Reserved
    bmp.writeUInt32LE(headerSize + paletteSize, 10); // Pixel data offset

    // DIB Header
    bmp.writeUInt32LE(40, 14); // DIB header size
    bmp.writeInt32LE(width, 18); // Width
    bmp.writeInt32LE(-height, 22); // Height (negative for top-down)
    bmp.writeUInt16LE(1, 26); // Color planes
    bmp.writeUInt16LE(8, 28); // Bits per pixel (8 for indexed)
    bmp.writeUInt32LE(0, 30); // No compression
    bmp.writeUInt32LE(pixelDataSize, 34); // Image size
    bmp.writeUInt32LE(0, 38); // H-DPI
    bmp.writeUInt32LE(0, 42); // V-DPI
    bmp.writeUInt32LE(16, 46); // Colors in palette
    bmp.writeUInt32LE(0, 50); // Important colors (0 = all)    // Write palette (just 16 colors for the tile)
    let paletteOffset = 54;
    for (let i = 0; i < 16; i++) {
        if (i < palette.length) {
            // Ensure color values are in valid range (0-255)
            const b = Math.max(0, Math.min(255, palette[i].b || 0));
            const g = Math.max(0, Math.min(255, palette[i].g || 0));
            const r = Math.max(0, Math.min(255, palette[i].r || 0));
            
            bmp.writeUInt8(b, paletteOffset++); // Blue
            bmp.writeUInt8(g, paletteOffset++); // Green
            bmp.writeUInt8(r, paletteOffset++); // Red
            bmp.writeUInt8(0, paletteOffset++); // Alpha (unused)
        } else {
            // Fill remaining entries with black
            bmp.writeUInt32LE(0, paletteOffset);
            paletteOffset += 4;
        }
    }

    // Write pixel data
    const dataOffset = headerSize + paletteSize;
    let pixelOffset = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            bmp.writeUInt8(pixels[y * width + x], dataOffset + pixelOffset++);
        }
        
        // Pad row to multiple of 4 bytes
        while (pixelOffset % 4 !== 0) {
            bmp.writeUInt8(0, dataOffset + pixelOffset++);
        }
    }

    writeFileSync(filepath, bmp);
}

// Save BMP file with indexed color palette
function saveBMP(width, height, pixels, palette, filepath) {
    const headerSize = 14 + 40; // BMP header + DIB header
    const paletteSize = 256 * 4; // 256 colors * 4 bytes (BGRA)
    const rowSize = Math.ceil(width / 4) * 4; // Rows padded to multiple of 4 bytes
    const pixelDataSize = rowSize * height;
    const fileSize = headerSize + paletteSize + pixelDataSize;

    const bmp = Buffer.alloc(fileSize);

    // BMP Header
    bmp.write('BM', 0); // Magic number
    bmp.writeUInt32LE(fileSize, 2); // File size
    bmp.writeUInt32LE(0, 6); // Reserved
    bmp.writeUInt32LE(headerSize + paletteSize, 10); // Pixel data offset

    // DIB Header
    bmp.writeUInt32LE(40, 14); // DIB header size
    bmp.writeInt32LE(width, 18); // Width
    bmp.writeInt32LE(-height, 22); // Height (negative for top-down)
    bmp.writeUInt16LE(1, 26); // Color planes
    bmp.writeUInt16LE(8, 28); // Bits per pixel (8 for indexed)
    bmp.writeUInt32LE(0, 30); // No compression
    bmp.writeUInt32LE(pixelDataSize, 34); // Image size
    bmp.writeUInt32LE(0, 38); // H-DPI
    bmp.writeUInt32LE(0, 42); // V-DPI
    bmp.writeUInt32LE(0, 46); // Colors in palette (0 = 2^n)
    bmp.writeUInt32LE(0, 50); // Important colors (0 = all)    // Write palette
    let paletteOffset = 54;
    for (let i = 0; i < 256; i++) {
        if (i < palette.length) {
            // Ensure color values are in valid range (0-255)
            const b = Math.max(0, Math.min(255, palette[i][2] || 0));
            const g = Math.max(0, Math.min(255, palette[i][1] || 0));
            const r = Math.max(0, Math.min(255, palette[i][0] || 0));
            
            bmp.writeUInt8(b, paletteOffset++); // Blue
            bmp.writeUInt8(g, paletteOffset++); // Green
            bmp.writeUInt8(r, paletteOffset++); // Red
            bmp.writeUInt8(0, paletteOffset++); // Alpha (unused)
        } else {
            // Fill remaining entries with black
            bmp.writeUInt32LE(0, paletteOffset);
            paletteOffset += 4;
        }
    }

    // Write pixel data
    const dataOffset = headerSize + paletteSize;
    let pixelOffset = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = y * width + x;
            bmp.writeUInt8(pixels[index], dataOffset + pixelOffset++);
        }
        
        // Pad row to multiple of 4 bytes
        while (pixelOffset % 4 !== 0) {
            bmp.writeUInt8(0, dataOffset + pixelOffset++);
        }
    }

    writeFileSync(filepath, bmp);
}

// Convert RGB to Lab color space for better color matching
function rgbToLab(r, g, b) {
    // Convert RGB to XYZ
    let rr = r / 255;
    let gg = g / 255;
    let bb = b / 255;
    
    rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
    gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
    bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;
    
    const x = (rr * 0.4124 + gg * 0.3576 + bb * 0.1805) / 0.95047;
    const y = (rr * 0.2126 + gg * 0.7152 + bb * 0.0722) / 1.00000;
    const z = (rr * 0.0193 + gg * 0.1192 + bb * 0.9505) / 1.08883;
    
    // Convert XYZ to Lab
    const xr = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
    const yr = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
    const zr = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
    
    const l = (116 * yr) - 16;
    const a = 500 * (xr - yr);
    const bb2 = 200 * (yr - zr);
    
    return { l, a, b: bb2 };
}

// Calculate color difference in Lab space
function deltaE(lab1, lab2) {
    const dl = lab1.l - lab2.l;
    const da = lab1.a - lab2.a;
    const db = lab1.b - lab2.b;
    return Math.sqrt(dl*dl + da*da + db*db);
}

// Convert 24-bit RGB to Genesis 9-bit RGB
function rgbToGenesis(r, g, b) {
    r = Math.round((r / 255) * 7) & 0x7;
    g = Math.round((g / 255) * 7) & 0x7;
    b = Math.round((b / 255) * 7) & 0x7;
    return ((b & 0x7) << 9) | ((g & 0x7) << 5) | ((r & 0x7) << 1);
}

// Read BMP file - handles multiple BMP formats
function readBMP(filepath) {
    try {
        const data = readFileSync(filepath);
        
        // Check BMP signature
        if (data[0] !== 0x42 || data[1] !== 0x4D) {
            throw new Error('Invalid BMP file format');
        }
        
        // Read BMP header
        const headerSize = data.readUInt32LE(14);
        const width = data.readInt32LE(18);
        const height = Math.abs(data.readInt32LE(22));
        const bpp = data.readUInt16LE(28);
        const compression = data.readUInt32LE(30);
        
        // Check if height is negative (top-down BMP)
        const isTopDown = data.readInt32LE(22) < 0;
        
        // Data offset where pixel data begins
        const dataOffset = data.readUInt32LE(10);
        
        // Always convert to a standard pixel format for our processing
        const pixels = [];
        let format = ''; // Store the format for metadata
        
        // Different handling based on BMP format
        if (bpp === 24 || bpp === 32) {
            // 24-bit or 32-bit true color handling
            format = `${bpp}-bit true color`;
            console.log(`Processing ${format} BMP`);
            
            // Read pixel data
            const bytesPerPixel = bpp / 8;
            const rowSize = Math.floor((bpp * width + 31) / 32) * 4;
            
            // Create pixel array
            for (let y = 0; y < height; y++) {
                const row = [];
                const rowOffset = isTopDown ? y : (height - 1 - y);
                
                for (let x = 0; x < width; x++) {
                    const pixelOffset = dataOffset + rowOffset * rowSize + x * bytesPerPixel;
                    
                    // BMP stores colors as BGR(A)
                    const b = data[pixelOffset];
                    const g = data[pixelOffset + 1];
                    const r = data[pixelOffset + 2];
                    
                    row.push({ r, g, b });
                }
                
                pixels.push(row);
            }
        } else if (bpp === 8 && compression === 0) {
            // 8-bit indexed color handling
            format = '8-bit indexed color';
            console.log(`Processing ${format} BMP`);
            
            // Read palette
            const palette = [];
            for (let i = 0; i < 256; i++) {
                const paletteOffset = 54 + i * 4; // 14 + 40 (header) + palette index * 4
                if (paletteOffset + 3 < dataOffset) {
                    const b = data[paletteOffset];
                    const g = data[paletteOffset + 1];
                    const r = data[paletteOffset + 2];
                    palette.push({ r, g, b });
                }
            }
            
            // Read pixel data
            const rowSize = Math.floor((bpp * width + 31) / 32) * 4;
            
            // Create pixel array
            for (let y = 0; y < height; y++) {
                const row = [];
                const rowOffset = isTopDown ? y : (height - 1 - y);
                
                for (let x = 0; x < width; x++) {
                    const pixelOffset = dataOffset + rowOffset * rowSize + x;
                    const colorIndex = data[pixelOffset];
                    
                    // Use color from palette
                    if (colorIndex < palette.length) {
                        row.push(palette[colorIndex]);
                    } else {
                        // Default to black if index is out of bounds
                        row.push({ r: 0, g: 0, b: 0 });
                    }
                }
                
                pixels.push(row);
            }
        } else if (bpp === 4 && compression === 0) {
            // 4-bit indexed color handling
            format = '4-bit indexed color';
            console.log(`Processing ${format} BMP`);
            
            // Read palette
            const palette = [];
            for (let i = 0; i < 16; i++) {
                const paletteOffset = 54 + i * 4; // 14 + 40 (header) + palette index * 4
                if (paletteOffset + 3 < dataOffset) {
                    const b = data[paletteOffset];
                    const g = data[paletteOffset + 1];
                    const r = data[paletteOffset + 2];
                    palette.push({ r, g, b });
                }
            }
            
            // Read pixel data
            const rowSize = Math.floor((bpp * width + 31) / 32) * 4;
            
            // Create pixel array
            for (let y = 0; y < height; y++) {
                const row = [];
                const rowOffset = isTopDown ? y : (height - 1 - y);
                
                for (let x = 0; x < width; x++) {
                    const pixelOffset = dataOffset + rowOffset * rowSize + Math.floor(x / 2);
                    let colorIndex;
                    
                    // Each byte contains two 4-bit color indices
                    if (x % 2 === 0) {
                        // First pixel in byte (high nibble)
                        colorIndex = (data[pixelOffset] >> 4) & 0x0F;
                    } else {
                        // Second pixel in byte (low nibble)
                        colorIndex = data[pixelOffset] & 0x0F;
                    }
                    
                    // Use color from palette
                    if (colorIndex < palette.length) {
                        row.push(palette[colorIndex]);
                    } else {
                        // Default to black if index is out of bounds
                        row.push({ r: 0, g: 0, b: 0 });
                    }
                }
                
                pixels.push(row);
            }
        } else if (bpp === 1 && compression === 0) {
            // 1-bit monochrome handling
            format = '1-bit monochrome';
            console.log(`Processing ${format} BMP`);
            
            // Read the 2-color palette
            const palette = [];
            for (let i = 0; i < 2; i++) {
                const paletteOffset = 54 + i * 4; // 14 + 40 (header) + palette index * 4
                if (paletteOffset + 3 < dataOffset) {
                    const b = data[paletteOffset];
                    const g = data[paletteOffset + 1];
                    const r = data[paletteOffset + 2];
                    palette.push({ r, g, b });
                }
            }
            
            // If palette wasn't read properly, use default black/white
            if (palette.length < 2) {
                palette[0] = { r: 0, g: 0, b: 0 };       // Black
                palette[1] = { r: 255, g: 255, b: 255 }; // White
            }
            
            // Read pixel data
            const rowSize = Math.floor((bpp * width + 31) / 32) * 4;
            
            // Create pixel array
            for (let y = 0; y < height; y++) {
                const row = [];
                const rowOffset = isTopDown ? y : (height - 1 - y);
                
                for (let x = 0; x < width; x++) {
                    const byteOffset = dataOffset + rowOffset * rowSize + Math.floor(x / 8);
                    const bitOffset = 7 - (x % 8); // Bits are packed from MSB to LSB
                    
                    const colorIndex = (data[byteOffset] >> bitOffset) & 0x01;
                    row.push(palette[colorIndex]);
                }
                
                pixels.push(row);
            }
        } else {
            throw new Error(`Unsupported BMP format: ${bpp} bpp, compression: ${compression}`);
        }
        
        return { width, height, bpp, format, pixels };
    } catch (error) {
        console.error(`Error reading BMP file: ${error.message}`);
        throw error;
    }
}

// Count unique colors in a region
function countUniqueColors(pixels, startX, startY, endX, endY) {
    const colorMap = new Map();
    
    for (let y = startY; y < endY; y++) {
        if (y >= pixels.length) continue;
        
        for (let x = startX; x < endX; x++) {
            if (x >= pixels[y].length) continue;
            
            const pixel = pixels[y][x];
            const key = `${pixel.r},${pixel.g},${pixel.b}`;
            
            if (!colorMap.has(key)) {
                colorMap.set(key, 1);
            } else {
                colorMap.set(key, colorMap.get(key) + 1);
            }
        }
    }
    
    return colorMap;
}

// Find the optimal split points to divide the image into 4 quadrants
function findOptimalSplits(pixels, width, height, balanceStrategy = 'count') {
    console.log(`Using ${balanceStrategy} balance strategy for quadrant splitting`);
    
    // Define possible split points (avoid edges)
    const minX = Math.floor(width * 0.3);
    const maxX = Math.floor(width * 0.7);
    const minY = Math.floor(height * 0.3);
    const maxY = Math.floor(height * 0.7);
    
    let bestH = Math.floor(height / 2);
    let bestV = Math.floor(width / 2);
    let lowestImbalance = Infinity;
    
    // Try different split combinations
    for (let h = minY; h <= maxY; h += 8) {
        for (let v = minX; v <= maxX; v += 8) {
            // Define the four quadrants with these split points
            const q1 = { startX: 0, startY: 0, endX: v, endY: h };
            const q2 = { startX: v, startY: 0, endX: width, endY: h };
            const q3 = { startX: 0, startY: h, endX: v, endY: height };
            const q4 = { startX: v, startY: h, endX: width, endY: height };
            
            // Get colors for each quadrant based on the chosen strategy
            const colorSets = [
                getColorsInRegion(pixels, q1.startX, q1.startY, q1.endX, q1.endY),
                getColorsInRegion(pixels, q2.startX, q2.startY, q2.endX, q2.endY),
                getColorsInRegion(pixels, q3.startX, q3.startY, q3.endX, q3.endY),
                getColorsInRegion(pixels, q4.startX, q4.startY, q4.endX, q4.endY)
            ];
            
            // Calculate imbalance based on chosen strategy
            let imbalance;
            
            switch (balanceStrategy) {
                case 'count':
                    imbalance = calculateCountImbalance(colorSets);
                    break;
                case 'entropy':
                    imbalance = calculateEntropyImbalance(colorSets);
                    break;
                case 'importance':
                    imbalance = calculateImportanceImbalance(colorSets);
                    break;
                case 'area':
                    imbalance = calculateAreaImbalance([q1, q2, q3, q4]);
                    break;
                default:
                    imbalance = calculateCountImbalance(colorSets);
            }
            
            // Update best splits if this is better
            if (imbalance < lowestImbalance) {
                lowestImbalance = imbalance;
                bestH = h;
                bestV = v;
            }
        }
    }
    
    return { horizontal: bestH, vertical: bestV };
}

// Find most used colors in a specific region
function findDominantColors(pixels, startX, startY, endX, endY, maxColors = 16) {
    // Count colors in this region
    const colorMap = countUniqueColors(pixels, startX, startY, endX, endY);
    
    // If we have too many unique colors, we need to quantize them
    const uniqueColors = colorMap.size;
    if (uniqueColors > 100) {
        console.log(`Region has ${uniqueColors} unique colors, performing color quantization...`);
        return quantizeColors(colorMap, maxColors);
    }
    
    // Convert map to array and sort by frequency
    const colorArr = [];
    for (const [key, count] of colorMap.entries()) {
        const [r, g, b] = key.split(',').map(Number);
        colorArr.push({ r, g, b, count });
    }
    
    // Sort by frequency (most common first)
    colorArr.sort((a, b) => b.count - a.count);
    
    // Take top 'maxColors' colors, or all if there are fewer
    return colorArr.slice(0, maxColors);
}

// Quantize colors to a smaller palette using k-means clustering
function quantizeColors(colorMap, maxColors) {
    // Extract color points with their frequencies
    const colorPoints = [];
    for (const [key, count] of colorMap.entries()) {
        const [r, g, b] = key.split(',').map(Number);
        // We'll use Lab color space for better clustering
        const lab = rgbToLab(r, g, b);
        colorPoints.push({
            r, g, b,
            l: lab.l, 
            a: lab.a, 
            bValue: lab.b, // Renamed to avoid conflict with the RGB 'b' property
            count
        });
    }
    
    // Initialize centroids with "k-means++" approach
    const centroids = [];
    
    // First centroid - pick randomly with probability proportional to frequency
    let totalCount = 0;
    for (const point of colorPoints) {
        totalCount += point.count;
    }
    
    let rnd = Math.random() * totalCount;
    let selectedIndex = 0;
    for (let i = 0; i < colorPoints.length; i++) {
        rnd -= colorPoints[i].count;
        if (rnd <= 0) {
            selectedIndex = i;
            break;
        }
    }
    
    // Add first centroid
    centroids.push({...colorPoints[selectedIndex]});
    
    // Choose remaining centroids
    for (let k = 1; k < maxColors && k < colorPoints.length; k++) {
        // Calculate minimum distance from each point to any existing centroid
        const distances = [];
        for (const point of colorPoints) {
            let minDistance = Infinity;
            for (const centroid of centroids) {
                const distance = Math.sqrt(
                    Math.pow(point.l - centroid.l, 2) +
                    Math.pow(point.a - centroid.a, 2) +
                    Math.pow(point.b - centroid.b, 2)
                ) * point.count; // Weight by frequency
                
                minDistance = Math.min(minDistance, distance);
            }
            distances.push(minDistance);
        }
        
        // Choose point with maximum distance as the next centroid
        let maxDistance = -1;
        let maxIndex = -1;
        for (let i = 0; i < distances.length; i++) {
            if (distances[i] > maxDistance) {
                maxDistance = distances[i];
                maxIndex = i;
            }
        }
        
        centroids.push({...colorPoints[maxIndex]});
    }
    
    // Run k-means iterations
    const MAX_ITERATIONS = 10;
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
        // Assign points to clusters
        const clusters = Array(centroids.length).fill().map(() => []);
        
        for (const point of colorPoints) {
            let minDistance = Infinity;
            let closestCentroid = 0;
              for (let i = 0; i < centroids.length; i++) {
                const distance = Math.sqrt(
                    Math.pow(point.l - centroids[i].l, 2) +
                    Math.pow(point.a - centroids[i].a, 2) +
                    Math.pow(point.bValue - centroids[i].bValue, 2)
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCentroid = i;
                }
            }
            
            clusters[closestCentroid].push(point);
        }
        
        // Update centroids
        let changed = false;
        for (let i = 0; i < centroids.length; i++) {            if (clusters[i].length === 0) continue;
            
            let sumL = 0, sumA = 0, sumBValue = 0, sumR = 0, sumG = 0, sumBlue = 0, totalWeight = 0;
            
            for (const point of clusters[i]) {
                sumL += point.l * point.count;
                sumA += point.a * point.count;
                sumBValue += point.bValue * point.count;
                sumR += point.r * point.count;
                sumG += point.g * point.count;
                sumBlue += point.b * point.count;
                totalWeight += point.count;
            }// Ensure RGB values are clamped to valid range 0-255
            const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
            
            const newCentroid = {
                l: sumL / totalWeight,
                a: sumA / totalWeight,
                bValue: sumBValue / totalWeight,
                r: clamp(sumR / totalWeight),
                g: clamp(sumG / totalWeight),
                b: clamp(sumBlue / totalWeight),
                count: totalWeight
            };
              // Check if centroid changed significantly
            const dist = Math.sqrt(
                Math.pow(newCentroid.l - centroids[i].l, 2) +
                Math.pow(newCentroid.a - centroids[i].a, 2) +
                Math.pow(newCentroid.bValue - centroids[i].bValue, 2)
            );
            
            if (dist > 1.0) {
                changed = true;
            }
            
            centroids[i] = newCentroid;
        }
        
        // If centroids didn't change much, we're done
        if (!changed) break;
    }
    
    // Convert centroids to the format expected by the rest of the code
    return centroids.map(c => ({
        r: c.r,
        g: c.g,
        b: c.b,
        count: c.count
    }));
}

// Find best matching color from palette using Delta E color difference
function findBestMatch(pixel, palette) {
    // Special case for very small palettes to avoid black-only output
    if (palette.length < 3) {
        return 0; // Just use the first color
    }
    
    const targetLab = rgbToLab(pixel.r, pixel.g, pixel.b);
    let bestMatch = 0;
    let lowestDistance = Infinity;
    
    for (let i = 0; i < palette.length; i++) {
        const color = palette[i];
        const colorLab = rgbToLab(color.r, color.g, color.b);
        const distance = deltaE(targetLab, colorLab);
        
        if (distance < lowestDistance) {
            lowestDistance = distance;
            bestMatch = i;
        }
    }
    
    return bestMatch;
}

// Get colors in a specific region of the image with their frequencies
function getColorsInRegion(pixels, left, top, right, bottom) {
    const colorMap = new Map();
    let totalPixels = 0;
    
    for (let y = top; y < bottom; y++) {
        if (y >= pixels.length) continue;
        
        for (let x = left; x < right; x++) {
            if (x >= pixels[y].length) continue;
            
            const pixel = pixels[y][x];
            const key = `${pixel.r},${pixel.g},${pixel.b}`;
            totalPixels++;
            
            if (!colorMap.has(key)) {
                colorMap.set(key, { 
                    r: pixel.r, 
                    g: pixel.g, 
                    b: pixel.b, 
                    count: 1 
                });
            } else {
                const color = colorMap.get(key);
                color.count++;
            }
        }
    }
    
    return Array.from(colorMap.values());
}

// Calculate count-based imbalance (looks at number of unique colors)
function calculateCountImbalance(colorSets) {
    const counts = colorSets.map(colors => colors.length);
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    return maxCount - minCount;
}

// Calculate entropy-based imbalance (looks at color distribution diversity)
function calculateEntropyImbalance(colorSets) {
    const entropies = colorSets.map(colors => {
        // Skip if no colors
        if (colors.length === 0) return 0;
        
        // Calculate total count
        const totalCount = colors.reduce((sum, color) => sum + color.count, 0);
        
        // Calculate Shannon entropy
        return colors.reduce((entropy, color) => {
            const p = color.count / totalCount;
            return entropy - p * Math.log2(p);
        }, 0);
    });
    
    const maxEntropy = Math.max(...entropies);
    const minEntropy = Math.min(...entropies);
    return maxEntropy - minEntropy;
}

// Calculate importance-based imbalance (weighs colors by usage frequency) 
function calculateImportanceImbalance(colorSets) {
    // Calculate importance score for each quadrant
    const importanceScores = colorSets.map(colors => {
        return colors.reduce((sum, color) => sum + Math.pow(color.count, 0.75), 0);
    });
    
    const maxScore = Math.max(...importanceScores);
    const minScore = Math.min(...importanceScores);
    return maxScore - minScore;
}

// Calculate area-based imbalance (looks at pixel area in each quadrant)
function calculateAreaImbalance(quadrants) {
    const areas = quadrants.map(q => 
        (q.endX - q.startX) * (q.endY - q.startY)
    );
    
    const maxArea = Math.max(...areas);
    const minArea = Math.min(...areas);
    return maxArea - minArea;
}

// Optimize palettes by redistributing colors between quadrants for better overall quality
function optimizePalettes(palettes, pixels, quadrants) {
    console.log('Starting palette optimization...');
    
    // First, identify colors that could be shared across multiple quadrants
    const allColors = new Map();
    
    // Collect all unique Genesis colors from all palettes
    for (let paletteIndex = 0; paletteIndex < palettes.length; paletteIndex++) {
        const palette = palettes[paletteIndex];
        
        for (const color of palette) {
            const r = Math.round((color.r / 255) * 7);
            const g = Math.round((color.g / 255) * 7);
            const b = Math.round((color.b / 255) * 7);
            
            const key = `${r},${g},${b}`;
            
            if (!allColors.has(key)) {
                allColors.set(key, {
                    r: color.r,
                    g: color.g,
                    b: color.b,
                    count: 0,
                    quadrants: new Set()
                });
            }
            
            const colorInfo = allColors.get(key);
            colorInfo.count += color.count;
            colorInfo.quadrants.add(paletteIndex);
        }
    }
    
    // Identify common colors (used in multiple quadrants)
    const commonColors = Array.from(allColors.values())
        .filter(color => color.quadrants.size > 1)
        .sort((a, b) => b.count - a.count);
    
    // Process each quadrant's palette
    for (let i = 0; i < palettes.length; i++) {
        const q = quadrants[i];
        // Find which colors are most important for this quadrant
        const quadrantSpecificColors = palettes[i].map(color => {
            // Sample the image to see how much this color is used in this quadrant
            let usage = 0;
            const sampleStep = 2; // Sample every 2 pixels for performance
            
            for (let y = q.startY; y < q.endY; y += sampleStep) {
                if (y >= pixels.length) continue;
                
                for (let x = q.startX; x < q.endX; x += sampleStep) {
                    if (x >= pixels[y].length) continue;
                    
                    const pixel = pixels[y][x];
                    const targetLab = rgbToLab(pixel.r, pixel.g, pixel.b);
                    const colorLab = rgbToLab(color.r, color.g, color.b);
                    
                    // If this color is the closest match for this pixel
                    const distance = deltaE(targetLab, colorLab);
                    if (distance < 10) { // Threshold for "close enough"
                        usage++;
                    }
                }
            }
            
            return { ...color, usage };
        })
        .sort((a, b) => b.usage - a.usage);
        
        // Keep the top 10 most used colors from this quadrant
        const keptColors = quadrantSpecificColors.slice(0, 10);
        
        // Add 6 common colors that aren't too similar to already kept colors
        const addedCommonColors = [];
        for (const commonColor of commonColors) {
            // Skip if we already have enough colors
            if (keptColors.length + addedCommonColors.length >= 16) break;
            
            // Check if this common color is too similar to already kept colors
            let tooSimilar = false;
            const commonLab = rgbToLab(commonColor.r, commonColor.g, commonColor.b);
            
            for (const keptColor of [...keptColors, ...addedCommonColors]) {
                const keptLab = rgbToLab(keptColor.r, keptColor.g, keptColor.b);
                const distance = deltaE(commonLab, keptLab);
                
                if (distance < 15) { // Threshold for "too similar"
                    tooSimilar = true;
                    break;
                }
            }
            
            if (!tooSimilar) {
                addedCommonColors.push(commonColor);
            }
        }
        
        // Create optimized palette
        const optimizedPalette = [
            ...keptColors,
            ...addedCommonColors
        ];
        
        // Fill remaining slots if necessary
        while (optimizedPalette.length < 16) {
            // Add remaining quadrant-specific colors
            const remainingIndex = optimizedPalette.length - keptColors.length;
            if (remainingIndex < quadrantSpecificColors.length - keptColors.length) {
                optimizedPalette.push(quadrantSpecificColors[keptColors.length + remainingIndex]);
            } else {
                // Add black as fallback
                optimizedPalette.push({ r: 0, g: 0, b: 0 });
            }
        }
        
        // Update the palette
        palettes[i] = optimizedPalette.map(color => ({
            r: color.r,
            g: color.g,
            b: color.b
        }));
        
        console.log(`Optimized palette for quadrant ${i+1}`);
    }
    
    return palettes;
}

// Optimize a single palette based on regions that use it
function optimizePalette(palette, pixels, regions) {
    if (!palette || palette.length === 0 || regions.length === 0) return;
    
    // Sample pixels from all regions using this palette
    const samplePixels = [];
    const sampleStep = 3; // Sample every 3 pixels for performance
    
    for (const region of regions) {
        for (let y = region.startY; y < region.endY; y += sampleStep) {
            if (y >= pixels.length) continue;
            
            for (let x = region.startX; x < region.endX; x += sampleStep) {
                if (x >= pixels[y].length) continue;
                samplePixels.push(pixels[y][x]);
            }
        }
    }
    
    // Run k-means clustering on the sample pixels
    const kMeansPalette = quantizePixels(samplePixels, 16);
    
    // Replace palette with optimized colors
    for (let i = 0; i < kMeansPalette.length && i < palette.length; i++) {
        palette[i].r = kMeansPalette[i].r;
        palette[i].g = kMeansPalette[i].g;
        palette[i].b = kMeansPalette[i].b;
    }
    
    // Sort palette by luminance (keep index 0 as background)
    const background = palette[0];
    const sorted = palette.slice(1).sort((a, b) => {
        const lumA = 0.299 * a.r + 0.587 * a.g + 0.114 * a.b;
        const lumB = 0.299 * b.r + 0.587 * b.g + 0.114 * b.b;
        return lumA - lumB;
    });
    palette[0] = background;
    for (let i = 0; i < sorted.length; i++) {
        palette[i + 1] = sorted[i];
    }
}

// Quantize a set of pixels directly (not using a color map)
function quantizePixels(pixels, maxColors) {
    // Convert pixels to Lab color space for better clustering
    const points = pixels.map(pixel => {
        const lab = rgbToLab(pixel.r, pixel.g, pixel.b);
        return {
            r: pixel.r,
            g: pixel.g,
            b: pixel.b,
            l: lab.l,
            a: lab.a,
            bValue: lab.b,
            count: 1
        };
    });
    
    // Use k-means clustering similar to the existing quantizeColors function
    // But handling points directly rather than a color map
    
    // Initialize centroids with k-means++ approach
    const centroids = [];
    // First centroid randomly
    const firstIndex = Math.floor(Math.random() * points.length);
    centroids.push({...points[firstIndex]});
    
    // Choose remaining centroids
    for (let k = 1; k < maxColors && k < points.length; k++) {
        // Calculate distance from each point to nearest centroid
        const distances = points.map(point => {
            let minDist = Infinity;
            for (const centroid of centroids) {
                const dist = Math.sqrt(
                    Math.pow(point.l - centroid.l, 2) +
                    Math.pow(point.a - centroid.a, 2) +
                    Math.pow(point.bValue - centroid.bValue, 2)
                );
                minDist = Math.min(minDist, dist);
            }
            return minDist;
        });
        
        // Choose next centroid weighted by squared distance
        let totalWeight = distances.reduce((sum, dist) => sum + dist * dist, 0);
        let threshold = Math.random() * totalWeight;
        let sum = 0;
        let nextIndex = 0;
        
        for (let i = 0; i < distances.length; i++) {
            sum += distances[i] * distances[i];
            if (sum >= threshold) {
                nextIndex = i;
                break;
            }
        }
        
        centroids.push({...points[nextIndex]});
    }
    
    // Run k-means iterations
    for (let iter = 0; iter < 10; iter++) {
        // Assign points to clusters
        const clusters = Array(centroids.length).fill().map(() => []);
        
        for (const point of points) {
            let minDist = Infinity;
            let clusterId = 0;
            
            for (let i = 0; i < centroids.length; i++) {
                const dist = Math.sqrt(
                    Math.pow(point.l - centroids[i].l, 2) +
                    Math.pow(point.a - centroids[i].a, 2) +
                    Math.pow(point.bValue - centroids[i].bValue, 2)
                );
                
                if (dist < minDist) {
                    minDist = dist;
                    clusterId = i;
                }
            }
            
            clusters[clusterId].push(point);
        }
        
        // Update centroids
        let changed = false;
        
        for (let i = 0; i < centroids.length; i++) {
            if (clusters[i].length === 0) continue;
            
            const avgL = clusters[i].reduce((sum, p) => sum + p.l, 0) / clusters[i].length;
            const avgA = clusters[i].reduce((sum, p) => sum + p.a, 0) / clusters[i].length;
            const avgB = clusters[i].reduce((sum, p) => sum + p.bValue, 0) / clusters[i].length;
            const avgR = clusters[i].reduce((sum, p) => sum + p.r, 0) / clusters[i].length;
            const avgG = clusters[i].reduce((sum, p) => sum + p.g, 0) / clusters[i].length;
            const avgBlue = clusters[i].reduce((sum, p) => sum + p.b, 0) / clusters[i].length;
            
            const newCentroid = {
                l: avgL,
                a: avgA,
                bValue: avgB,
                r: Math.round(avgR),
                g: Math.round(avgG),
                b: Math.round(avgBlue),
                count: clusters[i].length
            };
            
            // Check if centroid changed
            const dist = Math.sqrt(
                Math.pow(newCentroid.l - centroids[i].l, 2) +
                Math.pow(newCentroid.a - centroids[i].a, 2) +
                Math.pow(newCentroid.bValue - centroids[i].bValue, 2)
            );
            
            if (dist > 0.5) {
                changed = true;
                centroids[i] = newCentroid;
            }
        }
        
        if (!changed) break;
    }
    
    return centroids.map(c => ({
        r: Math.max(0, Math.min(255, Math.round(c.r))),
        g: Math.max(0, Math.min(255, Math.round(c.g))),
        b: Math.max(0, Math.min(255, Math.round(c.b))),
        count: c.count
    }));
}

// Define the quadrants and palettes based on the number of palettes selected
function defineQuadrantsAndPalettes(bmp, opts) {
    const width = bmp.width;
    const height = bmp.height;
    let quadrants = [];
    console.log(`Using ${opts.palettes.length} palettes: ${opts.palettes.join(', ')}`);

    // New option for 9-section mode
    if (opts.sections === 9) {
        console.log('Using 9-section mode with optimized splits');
        return defineNineSections(bmp, opts);
    }
    
    if (opts.palettes.length === 1) {
        // Just one palette - use it for the entire image
        console.log('Using single palette for the entire image');
        quadrants = [
            { startX: 0, startY: 0, endX: width, endY: height, paletteIndex: opts.palettes[0] }
        ];
    } else if (opts.palettes.length === 2) {
        // Two palettes - try both horizontal and vertical splits
        console.log('Using 2 palettes with horizontal and vertical split strategies');
        
        // Find best horizontal split
        const hSplit = findOptimalSplitPoint(bmp.pixels, width, height, 'horizontal', opts.balanceStrategy);
        // Find best vertical split
        const vSplit = findOptimalSplitPoint(bmp.pixels, width, height, 'vertical', opts.balanceStrategy);
        
        // Determine which split has better balance
        const hImbalance = calculateImbalanceForSplit(bmp.pixels, width, height, 'horizontal', hSplit, opts.balanceStrategy);
        const vImbalance = calculateImbalanceForSplit(bmp.pixels, width, height, 'vertical', vSplit, opts.balanceStrategy);
        
        if (hImbalance <= vImbalance) {
            console.log(`Using horizontal split at ${hSplit} (imbalance: ${hImbalance})`);
            quadrants = [
                { startX: 0, startY: 0, endX: width, endY: hSplit, paletteIndex: opts.palettes[0] },
                { startX: 0, startY: hSplit, endX: width, endY: height, paletteIndex: opts.palettes[1] }
            ];
        } else {
            console.log(`Using vertical split at ${vSplit} (imbalance: ${vImbalance})`);
            quadrants = [
                { startX: 0, startY: 0, endX: vSplit, endY: height, paletteIndex: opts.palettes[0] },
                { startX: vSplit, startY: 0, endX: width, endY: height, paletteIndex: opts.palettes[1] }
            ];
        }
    } else if (opts.palettes.length === 3) {
        // Three palettes - try different arrangements
        console.log('Using 3 palettes with multiple split strategies');
        
        // Option 1: Horizontal split first, then vertical split on top
        const hSplit = findOptimalSplitPoint(bmp.pixels, width, height, 'horizontal', opts.balanceStrategy);
        const vSplitTop = findOptimalSplitPoint(
            bmp.pixels.slice(0, hSplit), 
            width, 
            hSplit, 
            'vertical', 
            opts.balanceStrategy
        );
        
        // Option 2: Horizontal split first, then vertical split on bottom
        const vSplitBottom = findOptimalSplitPoint(
            bmp.pixels.slice(hSplit), 
            width, 
            height - hSplit, 
            'vertical',
            opts.balanceStrategy
        );
        
        // Option 3: Vertical split first, then horizontal split on left
        const vSplit = findOptimalSplitPoint(bmp.pixels, width, height, 'vertical', opts.balanceStrategy);
        const hSplitLeft = findOptimalSplitPointForRegion(
            bmp.pixels,
            0, 0, vSplit, height,
            'horizontal',
            opts.balanceStrategy
        );
        
        // Option 4: Vertical split first, then horizontal split on right
        const hSplitRight = findOptimalSplitPointForRegion(
            bmp.pixels,
            vSplit, 0, width, height,
            'horizontal',
            opts.balanceStrategy
        );
        
        // Calculate imbalance for each arrangement
        const imbalance1 = calculateImbalanceForArrangement(bmp.pixels, [
            { startX: 0, startY: 0, endX: vSplitTop, endY: hSplit },
            { startX: vSplitTop, startY: 0, endX: width, endY: hSplit },
            { startX: 0, startY: hSplit, endX: width, endY: height }
        ], opts.balanceStrategy);
        
        const imbalance2 = calculateImbalanceForArrangement(bmp.pixels, [
            { startX: 0, startY: 0, endX: width, endY: hSplit },
            { startX: 0, startY: hSplit, endX: vSplitBottom, endY: height },
            { startX: vSplitBottom, startY: hSplit, endX: width, endY: height }
        ], opts.balanceStrategy);
        
        const imbalance3 = calculateImbalanceForArrangement(bmp.pixels, [
            { startX: 0, startY: 0, endX: vSplit, endY: hSplitLeft },
            { startX: 0, startY: hSplitLeft, endX: vSplit, endY: height },
            { startX: vSplit, startY: 0, endX: width, endY: height }
        ], opts.balanceStrategy);
        
        const imbalance4 = calculateImbalanceForArrangement(bmp.pixels, [
            { startX: 0, startY: 0, endX: vSplit, endY: height },
            { startX: vSplit, startY: 0, endX: width, endY: hSplitRight },
            { startX: vSplit, startY: hSplitRight, endX: width, endY: height }
        ], opts.balanceStrategy);
        
        // Find arrangement with least imbalance
        const imbalances = [imbalance1, imbalance2, imbalance3, imbalance4];
        const minImbalanceIndex = imbalances.indexOf(Math.min(...imbalances));
        
        console.log(`Selected arrangement ${minImbalanceIndex + 1} with imbalance ${imbalances[minImbalanceIndex]}`);
        
        switch (minImbalanceIndex) {
            case 0:
                quadrants = [
                    { startX: 0, startY: 0, endX: vSplitTop, endY: hSplit, paletteIndex: opts.palettes[0] },
                    { startX: vSplitTop, startY: 0, endX: width, endY: hSplit, paletteIndex: opts.palettes[1] },
                    { startX: 0, startY: hSplit, endX: width, endY: height, paletteIndex: opts.palettes[2] }
                ];
                break;
            case 1:
                quadrants = [
                    { startX: 0, startY: 0, endX: width, endY: hSplit, paletteIndex: opts.palettes[0] },
                    { startX: 0, startY: hSplit, endX: vSplitBottom, endY: height, paletteIndex: opts.palettes[1] },
                    { startX: vSplitBottom, startY: hSplit, endX: width, endY: height, paletteIndex: opts.palettes[2] }
                ];
                break;
            case 2:
                quadrants = [
                    { startX: 0, startY: 0, endX: vSplit, endY: hSplitLeft, paletteIndex: opts.palettes[0] },
                    { startX: 0, startY: hSplitLeft, endX: vSplit, endY: height, paletteIndex: opts.palettes[1] },
                    { startX: vSplit, startY: 0, endX: width, endY: height, paletteIndex: opts.palettes[2] }
                ];
                break;
            case 3:
                quadrants = [
                    { startX: 0, startY: 0, endX: vSplit, endY: height, paletteIndex: opts.palettes[0] },
                    { startX: vSplit, startY: 0, endX: width, endY: hSplitRight, paletteIndex: opts.palettes[1] },
                    { startX: vSplit, startY: hSplitRight, endX: width, endY: height, paletteIndex: opts.palettes[2] }
                ];
                break;
        }
    } else {
        // Four palettes - use the standard quadrant method
        console.log('Using 4 palettes with standard quadrant method');
        const splits = findOptimalSplits(bmp.pixels, width, height, opts.balanceStrategy);
        
        quadrants = [
            { startX: 0, startY: 0, endX: splits.vertical, endY: splits.horizontal, paletteIndex: opts.palettes[0] },
            { startX: splits.vertical, startY: 0, endX: width, endY: splits.horizontal, paletteIndex: opts.palettes[1] },
            { startX: 0, startY: splits.horizontal, endX: splits.vertical, endY: height, paletteIndex: opts.palettes[2] },
            { startX: splits.vertical, startY: splits.horizontal, endX: width, endY: height, paletteIndex: opts.palettes[3] }
        ];
    }
    
    return quadrants;
}

// New function to define 9 sections and map them to palettes
function defineNineSections(bmp, opts) {
    const width = bmp.width;
    const height = bmp.height;
    
    // Find optimal horizontal splits (dividing into 3 rows)
    const hSplit1 = findOptimalSplitPointForRange(bmp.pixels, width, height, 
                   'horizontal', 0.2, 0.4, opts.balanceStrategy);
    const hSplit2 = findOptimalSplitPointForRange(bmp.pixels, width, height, 
                   'horizontal', 0.6, 0.8, opts.balanceStrategy);
    
    // Find optimal vertical splits (dividing into 3 columns)
    const vSplit1 = findOptimalSplitPointForRange(bmp.pixels, width, height, 
                   'vertical', 0.2, 0.4, opts.balanceStrategy);
    const vSplit2 = findOptimalSplitPointForRange(bmp.pixels, width, height, 
                   'vertical', 0.6, 0.8, opts.balanceStrategy);
    
    console.log(`Horizontal splits at ${hSplit1} and ${hSplit2}`);
    console.log(`Vertical splits at ${vSplit1} and ${vSplit2}`);
    
    // Define all 9 sections
    const sections = [
        // Top row
        { startX: 0,       startY: 0,       endX: vSplit1, endY: hSplit1, index: 0 },
        { startX: vSplit1, startY: 0,       endX: vSplit2, endY: hSplit1, index: 1 },
        { startX: vSplit2, startY: 0,       endX: width,   endY: hSplit1, index: 2 },
        // Middle row
        { startX: 0,       startY: hSplit1, endX: vSplit1, endY: hSplit2, index: 3 },
        { startX: vSplit1, startY: hSplit1, endX: vSplit2, endY: hSplit2, index: 4 },
        { startX: vSplit2, startY: hSplit1, endX: width,   endY: hSplit2, index: 5 },
        // Bottom row
        { startX: 0,       startY: hSplit2, endX: vSplit1, endY: height,  index: 6 },
        { startX: vSplit1, startY: hSplit2, endX: vSplit2, endY: height,  index: 7 },
        { startX: vSplit2, startY: hSplit2, endX: width,   endY: height,  index: 8 }
    ];
    
    // Analyze color usage in each section
    const sectionStats = sections.map(section => {
        const colors = getColorsInRegion(bmp.pixels, section.startX, section.startY, 
                                        section.endX, section.endY);
        return {
            ...section,
            colorCount: colors.length,
            totalPixels: (section.endX - section.startX) * (section.endY - section.startY),
            colorDensity: colors.length / ((section.endX - section.startX) * (section.endY - section.startY))
        };
    });
    
    // Assign sections to palettes based on the number of available palettes
    let mappedSections;
    if (opts.palettes.length === 1) {
        // Single palette - all sections use it
        mappedSections = sections.map(section => ({
            ...section, 
            paletteIndex: opts.palettes[0]
        }));
    } else if (opts.palettes.length === 2) {
        // Map to 2 palettes - checkerboard pattern works well
        mappedSections = assignSectionsToPalettesCheckerboard(sections, opts.palettes);
    } else if (opts.palettes.length === 3) {
        // Map to 3 palettes - optimize based on color similarity
        mappedSections = assignSectionsTo3Palettes(sections, sectionStats, bmp.pixels, opts.palettes);
    } else {
        // Map to 4 palettes - optimized for color similarity
        mappedSections = assignSectionsTo4Palettes(sections, sectionStats, bmp.pixels, opts.palettes);
    }
    
    console.log("Section to palette mapping:");
    mappedSections.forEach(section => {
        console.log(`Section ${section.index} (${section.startX},${section.startY})-(${section.endX},${section.endY}) → Palette ${section.paletteIndex}`);
    });
    
    return mappedSections;
}

// Find optimal split point within a specified range
function findOptimalSplitPointForRange(pixels, width, height, direction, minPercent, maxPercent, balanceStrategy) {
    // Define possible split points within the percentage range
    let min, max;
    if (direction === 'horizontal') {
        min = Math.floor(height * minPercent);
        max = Math.floor(height * maxPercent);
    } else { // vertical
        min = Math.floor(width * minPercent);
        max = Math.floor(width * maxPercent);
    }
    
    let bestSplit = (direction === 'horizontal') ? 
                    Math.floor(height * (minPercent + maxPercent) / 2) : 
                    Math.floor(width * (minPercent + maxPercent) / 2);
    let lowestImbalance = Infinity;
    
    // Step size for larger images
    const stepSize = 8;
    
    // Try different split points
    for (let split = min; split <= max; split += stepSize) {
        // Calculate imbalance for this split
        let imbalance;
        if (direction === 'horizontal') {
            // Split top vs bottom
            const colorSet1 = getColorsInRegion(pixels, 0, 0, width, split);
            const colorSet2 = getColorsInRegion(pixels, 0, split, width, height);
            
            imbalance = calculateBalanceImbalance([colorSet1, colorSet2], balanceStrategy);
        } else {
            // Split left vs right
            const colorSet1 = getColorsInRegion(pixels, 0, 0, split, height);
            const colorSet2 = getColorsInRegion(pixels, split, 0, width, height);
            
            imbalance = calculateBalanceImbalance([colorSet1, colorSet2], balanceStrategy);
        }
        
        // Update best split if this is better
        if (imbalance < lowestImbalance) {
            lowestImbalance = imbalance;
            bestSplit = split;
        }
    }
    
    return bestSplit;
}

// Assign sections to 2 palettes using checkerboard pattern
function assignSectionsToPalettesCheckerboard(sections, palettes) {
    return sections.map(section => {
        // Checkerboard pattern - alternate palettes
        const row = Math.floor(section.index / 3);
        const col = section.index % 3;
        const paletteIndex = palettes[(row + col) % 2];
        
        return {
            ...section,
            paletteIndex
        };
    });
}

// Assign sections to 3 palettes based on color similarity
function assignSectionsTo3Palettes(sections, sectionStats, pixels, palettes) {
    // Group sections by similarity
    // Start with the corners and center as anchors
    const cornerIndices = [0, 2, 6, 8];
    const centerIndex = 4;
    
    // Calculate color similarity between sections
    const similarities = [];
    for (let i = 0; i < sections.length; i++) {
        for (let j = i + 1; j < sections.length; j++) {
            const similarity = calculateSectionSimilarity(
                pixels, 
                sections[i].startX, sections[i].startY, sections[i].endX, sections[i].endY,
                sections[j].startX, sections[j].startY, sections[j].endX, sections[j].endY
            );
            similarities.push({ section1: i, section2: j, similarity });
        }
    }
    
    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Assign sections to palettes
    const assignments = {};
    // Start with the center
    assignments[centerIndex] = palettes[0];
    
    // Assign corners to palettes based on similarity to center
    const cornerAssignments = cornerIndices.map(cornerIndex => ({
        cornerIndex,
        similarity: calculateSectionSimilarity(
            pixels,
            sections[centerIndex].startX, sections[centerIndex].startY, 
            sections[centerIndex].endX, sections[centerIndex].endY,
            sections[cornerIndex].startX, sections[cornerIndex].startY, 
            sections[cornerIndex].endX, sections[cornerIndex].endY
        )
    })).sort((a, b) => a.similarity - b.similarity);
    
    // Assign top two similar corners to palette 1, bottom two to palette 2
    assignments[cornerAssignments[0].cornerIndex] = palettes[1];
    assignments[cornerAssignments[1].cornerIndex] = palettes[1];
    assignments[cornerAssignments[2].cornerIndex] = palettes[2];
    assignments[cornerAssignments[3].cornerIndex] = palettes[2];
    
    // Assign remaining sections based on similarity
    const remainingIndices = [1, 3, 5, 7];
    for (const index of remainingIndices) {
        // Find which palette it's most similar to
        let bestPalette = null;
        let bestSimilarity = -Infinity;
        
        for (const paletteIndex of [palettes[0], palettes[1], palettes[2]]) {
            let totalSimilarity = 0;
            let count = 0;
            
            // Check similarity to all sections already in this palette
            for (const [sectionIndex, assignedPalette] of Object.entries(assignments)) {
                if (assignedPalette === paletteIndex) {
                    const sim = calculateSectionSimilarity(
                        pixels,
                        sections[index].startX, sections[index].startY, 
                        sections[index].endX, sections[index].endY,
                        sections[sectionIndex].startX, sections[sectionIndex].startY, 
                        sections[sectionIndex].endX, sections[sectionIndex].endY
                    );
                    totalSimilarity += sim;
                    count++;
                }
            }
            
            const avgSimilarity = count > 0 ? totalSimilarity / count : 0;
            if (avgSimilarity > bestSimilarity) {
                bestSimilarity = avgSimilarity;
                bestPalette = paletteIndex;
            }
        }
        
        assignments[index] = bestPalette;
    }
    
    return sections.map(section => ({
        ...section,
        paletteIndex: assignments[section.index]
    }));
}

// Assign sections to 4 palettes based on optimal grouping
function assignSectionsTo4Palettes(sections, sectionStats, pixels, palettes) {
    console.log('Grouping 9 sections into 4 palette groups based on color similarity');
    
    // Calculate similarity matrix between all sections
    const similarityMatrix = [];
    for (let i = 0; i < sections.length; i++) {
        similarityMatrix[i] = [];
        for (let j = 0; j < sections.length; j++) {
            if (i === j) {
                similarityMatrix[i][j] = 1; // Same section has perfect similarity
            } else if (j < i) {
                similarityMatrix[i][j] = similarityMatrix[j][i]; // Matrix is symmetric
            } else {
                const similarity = calculateSectionSimilarity(
                    pixels,
                    sections[i].startX, sections[i].startY, sections[i].endX, sections[i].endY,
                    sections[j].startX, sections[j].startY, sections[j].endX, sections[j].endY
                );
                similarityMatrix[i][j] = similarity;
            }
        }
    }
    
    // Sort sections by total similarity to all other sections (most similar first)
    const sectionsByConnectivity = sections.map((section, index) => {
        const totalSimilarity = similarityMatrix[index].reduce((sum, sim) => sum + sim, 0);
        return { index, totalSimilarity };
    }).sort((a, b) => b.totalSimilarity - a.totalSimilarity);
    
    // Initialize the 4 palette groups with the most connected sections as seeds
    const paletteGroups = [
        [sectionsByConnectivity[0].index],
        [sectionsByConnectivity[1].index],
        [sectionsByConnectivity[2].index],
        [sectionsByConnectivity[3].index]
    ];
    
    // Track which sections have been assigned
    const assigned = new Set(paletteGroups.flat());
    
    // Assign remaining sections to the most similar group
    const remainingSections = sections
        .filter((_, index) => !assigned.has(index))
        .map(section => section.index);
    
    for (const sectionIndex of remainingSections) {
        let bestGroupIndex = 0;
        let bestSimilarity = -Infinity;
        
        // Find the group with highest average similarity to this section
        for (let groupIndex = 0; groupIndex < 4; groupIndex++) {
            const group = paletteGroups[groupIndex];
            let totalSimilarity = 0;
            
            for (const memberIndex of group) {
                totalSimilarity += similarityMatrix[sectionIndex][memberIndex];
            }
            
            const avgSimilarity = totalSimilarity / group.length;
            
            if (avgSimilarity > bestSimilarity) {
                bestSimilarity = avgSimilarity;
                bestGroupIndex = groupIndex;
            }
        }
        
        // Assign this section to the best group
        paletteGroups[bestGroupIndex].push(sectionIndex);
    }
    
    // Assign each group to a palette
    const assignments = {};
    for (let i = 0; i < 4; i++) {
        const paletteIndex = palettes[i];
        for (const sectionIndex of paletteGroups[i]) {
            assignments[sectionIndex] = paletteIndex;
        }
    }
    
    // Log the groupings
    console.log('Section to palette groupings:');
    for (let i = 0; i < 4; i++) {
        console.log(`Palette ${palettes[i]}: Sections ${paletteGroups[i].join(', ')}`);
    }
    
    return sections.map(section => ({
        ...section,
        paletteIndex: assignments[section.index]
    }));
}

// Calculate similarity between two sections
function calculateSectionSimilarity(pixels, x1, y1, x2, y2, x3, y3, x4, y4) {
    const colors1 = getColorsInRegion(pixels, x1, y1, x2, y2);
    const colors2 = getColorsInRegion(pixels, x3, y3, x4, y4);
    
    // Create color maps for efficient lookup
    const colorMap1 = new Map();
    const colorMap2 = new Map();
    
    colors1.forEach(color => {
        colorMap1.set(`${color.r},${color.g},${color.b}`, color.count);
    });
    
    colors2.forEach(color => {
        colorMap2.set(`${color.r},${color.g},${color.b}`, color.count);
    });
    
    // Find shared colors
    let sharedColorCount = 0;
    let totalColors = 0;
    
    colorMap1.forEach((count, key) => {
        totalColors += count;
        if (colorMap2.has(key)) {
            sharedColorCount += Math.min(count, colorMap2.get(key));
        }
    });
    
    colorMap2.forEach((count, key) => {
        totalColors += count;
    });
    
    // Avoid double-counting shared colors
    totalColors -= sharedColorCount;
    
    return sharedColorCount / totalColors;
}

// Calculate overall cohesion of palette assignments
function calculatePaletteCohesion(sections, pixels, assignments) {
    // Group sections by palette
    const paletteGroups = {};
    
    assignments.forEach((palette, index) => {
        if (!paletteGroups[palette]) {
            paletteGroups[palette] = [];
        }
        paletteGroups[palette].push(index);
    });
    
    // Calculate internal similarity within each palette
    let totalSimilarity = 0;
    let totalPairs = 0;
    
    Object.values(paletteGroups).forEach(group => {
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                const section1 = sections[group[i]];
                const section2 = sections[group[j]];
                
                const similarity = calculateSectionSimilarity(
                    pixels,
                    section1.startX, section1.startY, section1.endX, section1.endY,
                    section2.startX, section2.startY, section2.endX, section2.endY
                );
                
                totalSimilarity += similarity;
                totalPairs++;
            }
        }
    });
    
    return totalPairs > 0 ? totalSimilarity / totalPairs : 0;
}



// Find optimal split point for a single dimension
function findOptimalSplitPoint(pixels, width, height, direction, balanceStrategy) {
    // Define possible split points (avoid edges)
    let min, max;
    if (direction === 'horizontal') {
        min = Math.floor(height * 0.3);
        max = Math.floor(height * 0.7);
    } else { // vertical
        min = Math.floor(width * 0.3);
        max = Math.floor(width * 0.7);
    }
    
    let bestSplit = (direction === 'horizontal') ? Math.floor(height / 2) : Math.floor(width / 2);
    let lowestImbalance = Infinity;
    
    // Step size for larger images
    const stepSize = 8;
    
    // Try different split points
    for (let split = min; split <= max; split += stepSize) {
        // Calculate imbalance for this split
        let imbalance;
        if (direction === 'horizontal') {
            // Split top vs bottom
            const colorSet1 = getColorsInRegion(pixels, 0, 0, width, split);
            const colorSet2 = getColorsInRegion(pixels, 0, split, width, height);
            
            imbalance = calculateBalanceImbalance([colorSet1, colorSet2], balanceStrategy);
        } else {
            // Split left vs right
            const colorSet1 = getColorsInRegion(pixels, 0, 0, split, height);
            const colorSet2 = getColorsInRegion(pixels, split, 0, width, height);
            
            imbalance = calculateBalanceImbalance([colorSet1, colorSet2], balanceStrategy);
        }
        
        // Update best split if this is better
        if (imbalance < lowestImbalance) {
            lowestImbalance = imbalance;
            bestSplit = split;
        }
    }
    
    return bestSplit;
}


// Calculate imbalance for a specific split
function calculateImbalanceForSplit(pixels, width, height, direction, splitPoint, balanceStrategy) {
    let colorSets = [];
    
    if (direction === 'horizontal') {
        // Split top vs bottom
        colorSets = [
            getColorsInRegion(pixels, 0, 0, width, splitPoint),
            getColorsInRegion(pixels, 0, splitPoint, width, height)
        ];
    } else {
        // Split left vs right
        colorSets = [
            getColorsInRegion(pixels, 0, 0, splitPoint, height),
            getColorsInRegion(pixels, splitPoint, 0, width, height)
        ];
    }
    
    return calculateBalanceImbalance(colorSets, balanceStrategy);

}

// Calculate imbalance for a specific arrangement of regions
function calculateImbalanceForArrangement(pixels, regions, balanceStrategy) {
    const colorSets = regions.map(region => 
        getColorsInRegion(pixels, region.startX, region.startY, region.endX, region.endY)
    );
    
    return calculateBalanceImbalance(colorSets, balanceStrategy);
}

// Calculate balance imbalance between regions
function calculateBalanceImbalance(colorSets, balanceStrategy) {
    switch (balanceStrategy) {
        case 'count':
            return calculateCountImbalance(colorSets);
        case 'entropy':
            return calculateEntropyImbalance(colorSets);
        case 'importance':
            return calculateImportanceImbalance(colorSets);
        case 'area':
            // Cannot calculate area-based imbalance here
            return calculateCountImbalance(colorSets);
        default:
            return calculateCountImbalance(colorSets);
    }
}

function saveACTPalette(palettes, filepath) {
    // ACT files are binary files with 256 RGB triplets (768 bytes)
    // followed by 2 bytes for color count and 2 bytes for transparent color index
    const buffer = Buffer.alloc(768 + 4);
    let offset = 0;
    
    // First, write the Genesis palettes (up to 4 palettes of 16 colors each)
    for (const palette of palettes) {
        for (const color of palette) {
            if (offset >= 768) break; // Ensure we don't exceed 256 colors
            
            // Write RGB triplet
            buffer.writeUInt8(color.r, offset++);
            buffer.writeUInt8(color.g, offset++);
            buffer.writeUInt8(color.b, offset++);
        }
    }
    
    // Fill remaining palette entries with zeros (black)
    while (offset < 768) {
        buffer.writeUInt8(0, offset++);
        buffer.writeUInt8(0, offset++);
        buffer.writeUInt8(0, offset++);
    }
    
    // Write the total color count (up to 256)
    const totalColors = Math.min(256, palettes.reduce((total, palette) => total + palette.length, 0));
    buffer.writeUInt16BE(totalColors, 768);
    
    // Write transparent color index (usually -1 if not used, use 0 as default)
    buffer.writeInt16BE(0, 770);
    
    // Write the buffer to the file
    writeFileSync(filepath, buffer);
    console.log(`Wrote palette to ${filepath}`);
}

// If running directly from command line
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    if (process.argv.length < 3) {
        console.log('Usage: node genesis-color-reduce.js <input.bmp> [options]');
        console.log('Options:');
        console.log('  --output=<directory>    Custom output directory');
        console.log('  --balance=<count|entropy|importance|area>   Balance strategy (default: count)');
        console.log('  --optimize=<true|false>   Optimize palettes (default: true)');
        console.log('  --verbose=<true|false>    Verbosity level (default: true)');
        console.log('  --palettes=<0,1,2,3>      Palettes to use (default: all 4)');
        console.log('  --sections=<4|9>          Number of sections to split image into (default: 4)');
        process.exit(1);
    }
    
    const inputPath = process.argv[2];
    // Parse additional options
    const options = {};
    for (let i = 3; i < process.argv.length; i++) {
        const arg = process.argv[i];
        if (arg.startsWith('--output=')) {
            options.outputDir = arg.substring(9);
        } else if (arg.startsWith('--balance=')) {
            options.balanceStrategy = arg.substring(10);
        } else if (arg.startsWith('--optimize=')) {
            options.optimizePalettes = arg.substring(11).toLowerCase() === 'true';
        } else if (arg.startsWith('--palettes=')) {
            // Parse palettes option (e.g., --palettes=0,1,2)
            options.palettes = arg.substring(11).split(',').map(Number);
        } else if (arg.startsWith('--verbose=')) {
            options.verbose = arg.substring(10).toLowerCase() === 'true';
        } else if (arg.startsWith('--sections=')) {
            // New option for number of sections
            options.sections = parseInt(arg.substring(11));
        }
    }
    
    // Process the BMP file
    processBmp(inputPath, options);
}

// Export functions for use in other scripts
export { processBmp, readBMP };
