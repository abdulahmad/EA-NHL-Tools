import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, basename, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Main function to process a BMP file, reduce colors for Genesis format,
 * and export to a structured output folder
 * 
 * @param {string} inputPath - Path to the input BMP file
 * @param {Object} options - Options for color reduction
 * @param {string} options.balanceStrategy - Strategy for quadrant balancing ('count', 'entropy', 'importance', 'area')
 * @param {boolean} options.optimizePalettes - Whether to optimize palettes for better color distribution
 * @param {boolean} options.verbose - Verbosity level
 * @param {string} options.outputDir - Custom output directory (optional)
 * @returns {Object} Result object with color reduction information
 */
function processBmp(inputPath, options = {}) {
    // Default options
    const opts = {
        balanceStrategy: options.balanceStrategy || 'count', // 'count', 'entropy', 'importance', 'area'
        optimizePalettes: options.optimizePalettes !== false,
        verbose: options.verbose !== false,
        outputDir: options.outputDir || null,
        ...options
    };

    // Create output directory structure
    const inputFileName = basename(inputPath, '.bmp');
    const strategyName = opts.balanceStrategy;
    
    // Default output directory is build/<filename>-<strategy>
    const outputDir = opts.outputDir || 
        join(__dirname, 'build', `${inputFileName}-${strategyName}`);
    
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
    
    // Find optimal splits
    console.log('Finding optimal quadrant splits...');
    const splits = findOptimalSplits(bmp.pixels, bmp.width, bmp.height, opts.balanceStrategy);
    
    console.log(`Optimal split points - Horizontal: ${splits.horizontal}, Vertical: ${splits.vertical}`);
    
    // Define the four quadrants
    const quadrants = [
        { startX: 0, startY: 0, endX: splits.vertical, endY: splits.horizontal },
        { startX: splits.vertical, startY: 0, endX: bmp.width, endY: splits.horizontal },
        { startX: 0, startY: splits.horizontal, endX: splits.vertical, endY: bmp.height },
        { startX: splits.vertical, startY: splits.horizontal, endX: bmp.width, endY: bmp.height }
    ];
    
    // Generate palettes for each quadrant
    console.log('Creating palettes for each quadrant...');
    const palettes = [];
    
    for (let i = 0; i < quadrants.length; i++) {
        const q = quadrants[i];
        console.log(`Generating palette for quadrant ${i+1}: (${q.startX},${q.startY}) to (${q.endX},${q.endY})`);
        const colors = findDominantColors(bmp.pixels, q.startX, q.startY, q.endX, q.endY);
        palettes.push(colors);
        console.log(`Palette ${i+1} has ${colors.length} colors`);
    }
    
    // Optimize palettes if requested
    if (opts.optimizePalettes) {
        console.log('Optimizing palettes to improve color distribution...');
        optimizePalettes(palettes, bmp.pixels, quadrants);
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
            let quadrantIndex;
            const tileX = tx * tileSize;
            const tileY = ty * tileSize;
            
            if (tileX < splits.vertical) {
                if (tileY < splits.horizontal) {
                    quadrantIndex = 0; // Top-left
                } else {
                    quadrantIndex = 2; // Bottom-left
                }
            } else {
                if (tileY < splits.horizontal) {
                    quadrantIndex = 1; // Top-right
                } else {
                    quadrantIndex = 3; // Bottom-right
                }
            }
            
            // Get palette for this quadrant
            const palette = palettes[quadrantIndex];
            
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
                        
                        // Convert to global palette index for the BMP (quadrantIndex * 16 + colorIndex)
                        const globalIndex = quadrantIndex * 16 + colorIndex;
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
                paletteIndex: quadrantIndex,
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
    
    // Create metadata
    const metadata = {
        sourceFile: inputPath,
        width: bmp.width,
        height: bmp.height,
        tileWidth: Math.ceil(bmp.width / tileSize),
        tileHeight: Math.ceil(bmp.height / tileSize), 
        totalTiles: tileData.length,
        balanceStrategy: opts.balanceStrategy,
        optimizedPalettes: opts.optimizePalettes,
        splits: {
            horizontal: splits.horizontal,
            vertical: splits.vertical
        },
        palettes: genesisPalettes.map((palette, index) => ({
            index,
            colors: palette.map(value => ({
                value,
                hex: genesisColorToHex(value),
                rgb: genesisColorToRgb(value)
            }))
        })),
        colorStats,
        tileAssignments,
        processingTime: new Date().toISOString()
    };
    
    // Save metadata JSON
    console.log('Writing metadata...');
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    // Save reduced color BMP
    console.log('Writing reduced color BMP...');
    saveBMP(bmp.width, bmp.height, flatPixels, combinedPalette, bmpOutputPath);
    
    console.log('Processing complete!');
    
    return {
        metadata,
        outputDir,
        bmpOutputPath,
        tilesDir
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
        colorFrequency: [{}, {}, {}, {}]
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
    bmp.writeUInt32LE(0, 50); // Important colors (0 = all)

    // Write palette (just 16 colors for the tile)
    let paletteOffset = 54;
    for (let i = 0; i < 16; i++) {
        if (i < palette.length) {
            bmp.writeUInt8(palette[i].b, paletteOffset++); // Blue
            bmp.writeUInt8(palette[i].g, paletteOffset++); // Green
            bmp.writeUInt8(palette[i].r, paletteOffset++); // Red
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
            bmp.writeUInt8(pixels[y * width + x], dataOffset + y * rowSize + x);
        }
        // Pad row to multiple of 4 bytes
        for (let x = width; x < rowSize; x++) {
            bmp.writeUInt8(0, dataOffset + y * rowSize + x);
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
    bmp.writeUInt32LE(0, 50); // Important colors (0 = all)

    // Write palette
    let paletteOffset = 54;
    for (let i = 0; i < 256; i++) {
        if (i < palette.length) {
            bmp.writeUInt8(palette[i][2], paletteOffset++); // Blue
            bmp.writeUInt8(palette[i][1], paletteOffset++); // Green
            bmp.writeUInt8(palette[i][0], paletteOffset++); // Red
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
            bmp.writeUInt8(pixels[pixelOffset++], dataOffset + y * rowSize + x);
        }
        // Pad row to multiple of 4 bytes
        for (let x = width; x < rowSize; x++) {
            bmp.writeUInt8(0, dataOffset + y * rowSize + x);
        }
    }

    writeFileSync(filepath, bmp);
}

// Convert RGB to Lab color space for better color matching
function rgbToLab(r, g, b) {
    // First convert RGB to XYZ
    r = r / 255;
    g = g / 255;
    b = b / 255;

    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    r *= 100;
    g *= 100;
    b *= 100;

    const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
    const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const z = r * 0.0193 + g * 0.1192 + b * 0.9505;

    // Then XYZ to Lab
    const xn = 95.047;
    const yn = 100.0;
    const zn = 108.883;

    const fx = x / xn > 0.008856 ? Math.pow(x / xn, 1/3) : (7.787 * x / xn) + 16/116;
    const fy = y / yn > 0.008856 ? Math.pow(y / yn, 1/3) : (7.787 * y / yn) + 16/116;
    const fz = z / zn > 0.008856 ? Math.pow(z / zn, 1/3) : (7.787 * z / zn) + 16/116;

    return {
        l: (116 * fy) - 16,
        a: 500 * (fx - fy),
        b: 200 * (fy - fz)
    };
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

// Read BMP file
// Read BMP file - handles multiple BMP formats
function readBMP(filepath) {
    const data = readFileSync(filepath);
    
    // Read BMP header
    const width = data.readInt32LE(18);
    const height = Math.abs(data.readInt32LE(22));
    const bpp = data.readUInt16LE(28);
    const compression = data.readUInt32LE(30);
    
    // Check if height is negative (top-down BMP)
    const isTopDown = data.readInt32LE(22) < 0;
    
    // Always convert to a standard pixel format for our processing
    const pixels = [];
    
    // Different handling based on BMP format
    if (bpp === 24 || bpp === 32) {
        // 24-bit or 32-bit true color handling
        console.log(`Processing ${bpp}-bit true color BMP`);
        
        // Read pixel data
        const bytesPerPixel = bpp / 8;
        const rowSize = Math.floor((width * bpp + 31) / 32) * 4;
        const pixelStart = data.readUInt32LE(10);
        
        for (let y = 0; y < height; y++) {
            const row = [];
            const rowY = isTopDown ? y : (height - 1 - y);
            
            for (let x = 0; x < width; x++) {
                const offset = pixelStart + rowY * rowSize + x * bytesPerPixel;
                const b = data[offset];
                const g = data[offset + 1];
                const r = data[offset + 2];
                // Alpha is ignored if present
                row.push({ r, g, b });
            }
            pixels.push(row);
        }
        
        return { width, height, pixels, bpp };
    } 
    else if (bpp === 8 && compression === 0) {
        // 8-bit indexed color handling
        console.log('Processing 8-bit indexed color BMP');
        
        // Read palette
        const paletteEntries = 256;
        const paletteStart = 54; // Usually right after the header for 8-bit BMPs
        const palette = [];
        
        for (let i = 0; i < paletteEntries; i++) {
            const offset = paletteStart + i * 4;
            const b = data[offset];
            const g = data[offset + 1];
            const r = data[offset + 2];
            // Fourth byte is usually reserved/alpha and is ignored
            palette.push({ r, g, b });
        }
        
        // Read pixel data
        const rowSize = Math.floor((width * bpp + 31) / 32) * 4;
        const pixelStart = data.readUInt32LE(10);
        
        for (let y = 0; y < height; y++) {
            const row = [];
            const rowY = isTopDown ? y : (height - 1 - y);
            
            for (let x = 0; x < width; x++) {
                const offset = pixelStart + rowY * rowSize + x;
                const colorIndex = data[offset];
                // Look up the color in the palette
                const color = palette[colorIndex];
                row.push(color);
            }
            pixels.push(row);
        }
        
        return { width, height, pixels, bpp, palette };
    } 
    else if (bpp === 4 && compression === 0) {
        // 4-bit indexed color handling
        console.log('Processing 4-bit indexed color BMP');
        
        // Read palette
        const paletteEntries = 16;
        const paletteStart = 54; // Usually right after the header for 4-bit BMPs
        const palette = [];
        
        for (let i = 0; i < paletteEntries; i++) {
            const offset = paletteStart + i * 4;
            const b = data[offset];
            const g = data[offset + 1];
            const r = data[offset + 2];
            // Fourth byte is usually reserved/alpha and is ignored
            palette.push({ r, g, b });
        }
        
        // Read pixel data
        const rowSize = Math.floor((width * bpp + 31) / 32) * 4;
        const pixelStart = data.readUInt32LE(10);
        
        for (let y = 0; y < height; y++) {
            const row = [];
            const rowY = isTopDown ? y : (height - 1 - y);
            
            for (let x = 0; x < width; x++) {
                // For 4-bit BMPs, each byte contains two pixels
                const byteOffset = pixelStart + rowY * rowSize + Math.floor(x / 2);
                const byte = data[byteOffset];
                
                // Extract the correct 4 bits based on even/odd position
                const colorIndex = (x % 2 === 0) ? 
                    (byte >> 4) & 0x0F : // First pixel in byte (high nibble)
                    byte & 0x0F;         // Second pixel in byte (low nibble)
                
                // Look up the color in the palette
                const color = palette[colorIndex];
                row.push(color);
            }
            pixels.push(row);
        }
        
        return { width, height, pixels, bpp, palette };
    }
    else if (bpp === 1 && compression === 0) {
        // 1-bit monochrome handling
        console.log('Processing 1-bit monochrome BMP');
        
        // Read palette (usually just black and white)
        const paletteEntries = 2;
        const paletteStart = 54; // Usually right after the header for 1-bit BMPs
        const palette = [];
        
        for (let i = 0; i < paletteEntries; i++) {
            const offset = paletteStart + i * 4;
            const b = data[offset];
            const g = data[offset + 1];
            const r = data[offset + 2];
            // Fourth byte is usually reserved/alpha and is ignored
            palette.push({ r, g, b });
        }
        
        // Read pixel data
        const rowSize = Math.floor((width * bpp + 31) / 32) * 4;
        const pixelStart = data.readUInt32LE(10);
        
        for (let y = 0; y < height; y++) {
            const row = [];
            const rowY = isTopDown ? y : (height - 1 - y);
            
            for (let x = 0; x < width; x++) {
                // For 1-bit BMPs, each byte contains 8 pixels
                const byteOffset = pixelStart + rowY * rowSize + Math.floor(x / 8);
                const byte = data[byteOffset];
                
                // Extract the correct bit based on position within the byte
                const bitPosition = 7 - (x % 8); // MSB first
                const colorIndex = (byte >> bitPosition) & 0x01;
                
                // Look up the color in the palette
                const color = palette[colorIndex];
                row.push(color);
            }
            pixels.push(row);
        }
        
        return { width, height, pixels, bpp, palette };
    }
    else {
        throw new Error(`Unsupported BMP format: ${bpp}-bit, compression=${compression}. Please convert to a supported format.`);
    }
}

// Count unique colors in a region
function countUniqueColors(pixels, startX, startY, endX, endY) {
    const colors = new Set();
    
    for (let y = startY; y < endY; y++) {
        if (y >= pixels.length) continue;
        
        for (let x = startX; x < endX; x++) {
            if (x >= pixels[y].length) continue;
            
            const pixel = pixels[y][x];
            // Quantize to Genesis color space (3-3-3)
            const r = Math.floor((pixel.r / 255) * 7);
            const g = Math.floor((pixel.g / 255) * 7);
            const b = Math.floor((pixel.b / 255) * 7);
            
            // Create a unique key for this color
            const key = `${r},${g},${b}`;
            colors.add(key);
        }
    }
    
    return colors.size;
}

// Find the optimal split points to divide the image into 4 quadrants
function findOptimalSplits(pixels, width, height, balanceStrategy = 'count') {
    const tileSize = 8; // Always align to 8x8 tiles
    const widthInTiles = Math.ceil(width / tileSize);
    const heightInTiles = Math.ceil(height / tileSize);
    
    // We need to find horizontal and vertical split points
    // Start with the middle
    let bestHSplit = Math.floor(heightInTiles / 2);
    let bestVSplit = Math.floor(widthInTiles / 2);
    
    let lowestImbalance = Infinity;
    
    console.log(`Image size in tiles: ${widthInTiles}x${heightInTiles}`);
    console.log(`Using balance strategy: ${balanceStrategy}`);
    
    // Search for better split points
    // Limit the search range to avoid excessive computation
    const searchRadius = Math.min(5, Math.floor(Math.min(widthInTiles, heightInTiles) / 4));

    // For progress tracking
    const totalIterations = (searchRadius * 2 + 1) * (searchRadius * 2 + 1);
    let currentIteration = 0;
    let lastProgressPercent = 0;

    for (let hSplit = bestHSplit - searchRadius; hSplit <= bestHSplit + searchRadius; hSplit++) {
        // Ensure split is within valid range and aligned to tile boundaries
        if (hSplit <= 0 || hSplit >= heightInTiles) continue;
        
        for (let vSplit = bestVSplit - searchRadius; vSplit <= bestVSplit + searchRadius; vSplit++) {
            // Ensure split is within valid range and aligned to tile boundaries
            if (vSplit <= 0 || vSplit >= widthInTiles) continue;
            
            // Update progress
            currentIteration++;
            const progressPercent = Math.floor((currentIteration / totalIterations) * 100);
            if (progressPercent >= lastProgressPercent + 10) {
                console.log(`Finding optimal splits: ${progressPercent}% complete`);
                lastProgressPercent = progressPercent;
            }
            
            // Calculate quadrant boundaries in pixels
            const q1 = { startX: 0, startY: 0, endX: vSplit * tileSize, endY: hSplit * tileSize };
            const q2 = { startX: vSplit * tileSize, startY: 0, endX: width, endY: hSplit * tileSize };
            const q3 = { startX: 0, startY: hSplit * tileSize, endX: vSplit * tileSize, endY: height };
            const q4 = { startX: vSplit * tileSize, startY: hSplit * tileSize, endX: width, endY: height };
            
            let imbalance = 0;
            
            if (balanceStrategy === 'count') {
                // Default strategy: balance unique color counts
                const colors1 = countUniqueColors(pixels, q1.startX, q1.startY, q1.endX, q1.endY);
                const colors2 = countUniqueColors(pixels, q2.startX, q2.startY, q2.endX, q2.endY);
                const colors3 = countUniqueColors(pixels, q3.startX, q3.startY, q3.endX, q3.endY);
                const colors4 = countUniqueColors(pixels, q4.startX, q4.startY, q4.endX, q4.endY);
                
                // Calculate imbalance as the maximum difference between any two quadrants
                const colorCounts = [colors1, colors2, colors3, colors4];
                
                for (let i = 0; i < colorCounts.length; i++) {
                    for (let j = i + 1; j < colorCounts.length; j++) {
                        imbalance = Math.max(imbalance, Math.abs(colorCounts[i] - colorCounts[j]));
                    }
                }
                
                // Add a slight preference for splits closer to the center
                const centerWeight = 0.02; // Small weight to avoid overriding color balance
                const centerDistanceH = Math.abs(hSplit - heightInTiles / 2) / heightInTiles;
                const centerDistanceV = Math.abs(vSplit - widthInTiles / 2) / widthInTiles;
                imbalance += (centerDistanceH + centerDistanceV) * centerWeight * Math.max(...colorCounts);
            } 
            else if (balanceStrategy === 'entropy') {
                // Advanced strategy: balance color diversity using entropy
                const quadColors = [
                    getColorsInRegion(pixels, q1.startX, q1.startY, q1.endX, q1.endY),
                    getColorsInRegion(pixels, q2.startX, q2.startY, q2.endX, q2.endY),
                    getColorsInRegion(pixels, q3.startX, q3.startY, q3.endX, q3.endY),
                    getColorsInRegion(pixels, q4.startX, q4.startY, q4.endX, q4.endY)
                ];
                
                imbalance = calculateEntropyImbalance(quadColors);
            }
            else if (balanceStrategy === 'importance') {
                // Advanced strategy: balance perceived visual importance
                const quadColors = [
                    getColorsInRegion(pixels, q1.startX, q1.startY, q1.endX, q1.endY),
                    getColorsInRegion(pixels, q2.startX, q2.startY, q2.endX, q2.endY),
                    getColorsInRegion(pixels, q3.startX, q3.startY, q3.endX, q3.endY),
                    getColorsInRegion(pixels, q4.startX, q4.startY, q4.endX, q4.endY)
                ];
                
                imbalance = calculateImportanceImbalance(quadColors);
            }
            else if (balanceStrategy === 'area') {
                // Simple strategy: just balance the area size
                const areas = [
                    (q1.endX - q1.startX) * (q1.endY - q1.startY),
                    (q2.endX - q2.startX) * (q2.endY - q2.startY),
                    (q3.endX - q3.startX) * (q3.endY - q3.startY),
                    (q4.endX - q4.startX) * (q4.endY - q4.startY)
                ];
                
                const maxArea = Math.max(...areas);
                const minArea = Math.min(...areas);
                imbalance = (maxArea - minArea) / (width * height);
            }
            
            // Check if this is the best split so far
            if (imbalance < lowestImbalance) {
                lowestImbalance = imbalance;
                bestHSplit = hSplit;
                bestVSplit = vSplit;
            }
        }
    }
    
    // Convert tile coordinates back to pixel coordinates
    return {
        horizontal: bestHSplit * tileSize,
        vertical: bestVSplit * tileSize,
        widthInTiles,
        heightInTiles
    };
}

// Find most used colors in a specific region
function findDominantColors(pixels, startX, startY, endX, endY, maxColors = 16) {
    const colorMap = new Map();
    
    // Count color occurrences in this region
    for (let y = startY; y < endY; y++) {
        if (y >= pixels.length) continue;
        
        for (let x = startX; x < endX; x++) {
            if (x >= pixels[y].length) continue;
            
            const pixel = pixels[y][x];
            // Quantize to Genesis color space
            const r = Math.floor((pixel.r / 255) * 7);
            const g = Math.floor((pixel.g / 255) * 7);
            const b = Math.floor((pixel.b / 255) * 7);
            
            const key = `${r},${g},${b}`;
            colorMap.set(key, (colorMap.get(key) || 0) + 1);
        }
    }
    
    // Convert to array and sort by frequency
    const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxColors)
        .map(([color]) => {
            const [r, g, b] = color.split(',').map(Number);
            return {
                r: Math.round(r * 255 / 7),
                g: Math.round(g * 255 / 7),
                b: Math.round(b * 255 / 7)
            };
        });
    
    // If we have less than maxColors, pad with black
    while (sortedColors.length < maxColors) {
        sortedColors.push({ r: 0, g: 0, b: 0 });
    }
    
    return sortedColors;
}

// Find best matching color from palette
function findBestMatch(pixel, palette) {
    const targetLab = rgbToLab(pixel.r, pixel.g, pixel.b);
    let bestMatch = { index: 0, distance: Infinity };
    
    for (let i = 0; i < palette.length; i++) {
        const color = palette[i];
        const colorLab = rgbToLab(color.r, color.g, color.b);
        const distance = deltaE(targetLab, colorLab);
        
        if (distance < bestMatch.distance) {
            bestMatch = {
                index: i,
                distance: distance
            };
        }
    }
    
    return bestMatch.index;
}

// Get colors in a specific region of the image with their frequencies
function getColorsInRegion(pixels, left, top, right, bottom) {
    const uniqueColors = new Map();
    
    for (let y = top; y < bottom; y++) {
        if (y >= pixels.length) continue;
        
        const row = pixels[y];
        for (let x = left; x < right; x++) {
            if (x >= row.length) continue;
            
            const pixel = row[x];
            const r = Math.round((pixel.r / 255) * 7);
            const g = Math.round((pixel.g / 255) * 7);
            const b = Math.round((pixel.b / 255) * 7);
            
            const colorKey = `${r},${g},${b}`;
            
            if (!uniqueColors.has(colorKey)) {
                uniqueColors.set(colorKey, {
                    r: r * 36, // Scale to approximate 8-bit (0-252)
                    g: g * 36,
                    b: b * 36,
                    count: 0
                });
            }
            
            uniqueColors.get(colorKey).count++;
        }
    }
    
    return Array.from(uniqueColors.values());
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
                    inPalettes: new Set()
                });
            }
            
            allColors.get(key).inPalettes.add(paletteIndex);
        }
    }
    
    // Count color usage in each quadrant
    for (let i = 0; i < quadrants.length; i++) {
        const q = quadrants[i];
        
        for (let y = q.startY; y < q.endY; y++) {
            if (y >= pixels.length) continue;
            
            for (let x = q.startX; x < q.endX; x++) {
                if (x >= pixels[y].length) continue;
                
                const pixel = pixels[y][x];
                const r = Math.round((pixel.r / 255) * 7);
                const g = Math.round((pixel.g / 255) * 7);
                const b = Math.round((pixel.b / 255) * 7);
                
                const key = `${r},${g},${b}`;
                
                if (allColors.has(key)) {
                    allColors.get(key).count++;
                }
            }
        }
    }
    
    // Identify commonly used colors across quadrants
    const commonColors = Array.from(allColors.entries())
        .filter(([_, color]) => color.count > 0)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 16) // Take top 16 most used colors
        .map(([key, color]) => ({
            r: color.r,
            g: color.g,
            b: color.b,
            count: color.count
        }));
    
    console.log(`Found ${commonColors.length} common colors that could be shared`);
    
    // Try to optimize each palette by including some common colors
    // but preserving the most important colors specific to each quadrant
    for (let i = 0; i < palettes.length; i++) {
        const quadrantSpecificColors = palettes[i]
            .map((color, index) => ({
                r: color.r,
                g: color.g,
                b: color.b,
                index
            }))
            // Calculate importance of each color for this quadrant
            .map(color => {
                const q = quadrants[i];
                let usage = 0;
                
                // Sample a subset of pixels to estimate color usage (for speed)
                const sampleStep = 4;  // Check every 4th pixel
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

// Convert full color BMP to indexed color using quadrant-based palettes
function convertToGenesisFormat(inputPath, outputPath) {
    console.log('Reading input BMP...');
    const bmp = readBMP(inputPath);
    
    console.log('Finding optimal quadrant splits...');
    const splits = findOptimalSplits(bmp.pixels, bmp.width, bmp.height);
    
    console.log(`Optimal split points - Horizontal: ${splits.horizontal}, Vertical: ${splits.vertical}`);
    
    // Define the four quadrants
    const quadrants = [
        { startX: 0, startY: 0, endX: splits.vertical, endY: splits.horizontal },
        { startX: splits.vertical, startY: 0, endX: bmp.width, endY: splits.horizontal },
        { startX: 0, startY: splits.horizontal, endX: splits.vertical, endY: bmp.height },
        { startX: splits.vertical, startY: splits.horizontal, endX: bmp.width, endY: bmp.height }
    ];
    
    // Analyze each quadrant to find dominant colors
    const quadrantColors = quadrants.map(q => {
        return findDominantColors(bmp.pixels, q.startX, q.startY, q.endX, q.endY, 16);
    });
    
    // Log the color information for each quadrant
    quadrantColors.forEach((colors, i) => {
        console.log(`Quadrant ${i + 1} dominant colors:`);
        colors.forEach((color, index) => {
            console.log(`  Color ${index + 1}: rgb(${color.r}, ${color.g}, ${color.b})`);
        });
    });
    
    // Calculate entropy and importance imbalances
    const entropyImbalance = calculateEntropyImbalance(quadrantColors);
    const importanceImbalance = calculateImportanceImbalance(quadrantColors);
    
    console.log(`Entropy imbalance: ${entropyImbalance}`);
    console.log(`Importance imbalance: ${importanceImbalance}`);
    
    // TODO: Use quadrantColors to create a custom palette for the output BMP
    // For now, just use the colors from the first quadrant
    const outputPalette = quadrantColors[0];
    
    // Convert the image to use the new palette
    const outputPixels = bmp.pixels.map(row => {
        return row.map(pixel => {
            const bestMatchIndex = findBestMatch(pixel, outputPalette);
            return bestMatchIndex;
        });
    });
    
    // Save the new BMP file
    console.log('Saving output BMP...');
    saveBMP(bmp.width, bmp.height, outputPixels, outputPalette, outputPath);
    console.log('Done.');
}

// Main entry point with configurable options
function convertToGenesisFormatWithOptions(inputPath, outputPath, options = {}) {
    // Default options
    const opts = {
        balanceStrategy: options.balanceStrategy || 'count', // 'count', 'entropy', 'importance', 'area'
        optimizePalettes: options.optimizePalettes !== false,
        verbose: options.verbose !== false,
        ...options
    };
    
    console.log('Reading input BMP...');
    const bmp = readBMP(inputPath);
    
    console.log(`Using balance strategy: ${opts.balanceStrategy}`);
    console.log('Finding optimal quadrant splits...');
    
    // Use appropriate balance strategy
    const splits = findOptimalSplits(bmp.pixels, bmp.width, bmp.height, opts.balanceStrategy);
    
    console.log(`Optimal split points - Horizontal: ${splits.horizontal}, Vertical: ${splits.vertical}`);
    
    // Define the four quadrants
    const quadrants = [
        { startX: 0, startY: 0, endX: splits.vertical, endY: splits.horizontal },
        { startX: splits.vertical, startY: 0, endX: bmp.width, endY: splits.horizontal },
        { startX: 0, startY: splits.horizontal, endX: splits.vertical, endY: bmp.height },
        { startX: splits.vertical, startY: splits.horizontal, endX: bmp.width, endY: bmp.height }
    ];
    
    // Generate palettes for each quadrant
    console.log('Creating palettes for each quadrant...');
    const palettes = [];
    
    for (let i = 0; i < quadrants.length; i++) {
        const q = quadrants[i];
        console.log(`Generating palette for quadrant ${i+1}: (${q.startX},${q.startY}) to (${q.endX},${q.endY})`);
        const colors = findDominantColors(bmp.pixels, q.startX, q.startY, q.endX, q.endY);
        palettes.push(colors);
        console.log(`Palette ${i+1} has ${colors.length} colors`);
    }
    
    // Optimize palettes if requested
    if (opts.optimizePalettes) {
        console.log('Optimizing palettes to improve color distribution...');
        optimizePalettes(palettes, bmp.pixels, quadrants);
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
    
    // Process the image tile by tile
    for (let ty = 0; ty < Math.ceil(bmp.height / tileSize); ty++) {
        const assignmentRow = [];
        const indexedRow = [];
        
        for (let tx = 0; tx < Math.ceil(bmp.width / tileSize); tx++) {
            // Determine which quadrant this tile belongs to
            let quadrantIndex;
            const tileX = tx * tileSize;
            const tileY = ty * tileSize;
            
            if (tileX < splits.vertical) {
                if (tileY < splits.horizontal) {
                    quadrantIndex = 0; // Top-left
                } else {
                    quadrantIndex = 2; // Bottom-left
                }
            } else {
                if (tileY < splits.horizontal) {
                    quadrantIndex = 1; // Top-right
                } else {
                    quadrantIndex = 3; // Bottom-right
                }
            }
            
            // Get palette for this quadrant
            const palette = palettes[quadrantIndex];
            
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
                        
                        // Convert to global palette index for the BMP (quadrantIndex * 16 + colorIndex)
                        const globalIndex = quadrantIndex * 16 + colorIndex;
                        flatPixels[py * bmp.width + px] = globalIndex;
                    } else {
                        // For pixels outside image bounds, use index 0 of this quadrant's palette
                        tile.push(0);
                    }
                }
            }
            
            indexedRow.push(tile);
            assignmentRow.push(quadrantIndex);
        }
        
        indexedPixels.push(indexedRow);
        tileAssignments.push(assignmentRow);
    }
    
    // Create output data structures
    const result = {
        width: bmp.width,
        height: bmp.height,
        splits: {
            horizontal: splits.horizontal,
            vertical: splits.vertical
        },
        balanceStrategy: opts.balanceStrategy,
        optimizedPalettes: opts.optimizePalettes,
        palettes: genesisPalettes,
        indexedPixels,
        tileAssignments
    };
    
    // Output JSON metadata
    console.log('Writing JSON output...');
    writeFileSync(outputPath, JSON.stringify(result, null, 2));
    
    // Output indexed BMP
    const bmpOutputPath = outputPath.replace('.json', '.bmp');
    console.log('Writing reduced color BMP...');
    saveBMP(bmp.width, bmp.height, flatPixels, combinedPalette, bmpOutputPath);
    
    console.log('Conversion complete!');
    console.log(`Output saved to ${bmpOutputPath} and ${outputPath}`);
    
    // Print palette statistics
    if (opts.verbose) {
        console.log('\nPalette Statistics:');
        palettes.forEach((palette, i) => {
            const quadrantNames = ['Top Left', 'Top Right', 'Bottom Left', 'Bottom Right'];
            console.log(`${quadrantNames[i]} Palette: ${palette.length} colors`);
            
            if (opts.verbose === 'full') {
                palette.forEach((color, j) => {
                    console.log(`  Color ${j}: RGB(${color.r}, ${color.g}, ${color.b})`);
                });
            }
        });
    }
    
    return result;
}

// Export the module for use in other scripts
export { convertToGenesisFormat, convertToGenesisFormatWithOptions };
