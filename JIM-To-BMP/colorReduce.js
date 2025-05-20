import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
function readBMP(filepath) {
    const data = readFileSync(filepath);
    
    // Read BMP header
    const width = data.readInt32LE(18);
    const height = Math.abs(data.readInt32LE(22));
    const bpp = data.readUInt16LE(28);
    
    if (bpp !== 24) {
        throw new Error('BMP must be 24-bit true color');
    }
    
    // Read pixel data
    const pixels = [];
    const rowSize = Math.floor((width * bpp + 31) / 32) * 4;
    const pixelStart = data.readUInt32LE(10);
    
    // Check if height is negative (top-down BMP)
    const isTopDown = data.readInt32LE(22) < 0;
    
    for (let y = 0; y < height; y++) {
        const row = [];
        const rowY = isTopDown ? y : (height - 1 - y);
        
        for (let x = 0; x < width; x++) {
            const offset = pixelStart + rowY * rowSize + x * 3;
            const b = data[offset];
            const g = data[offset + 1];
            const r = data[offset + 2];
            row.push({ r, g, b });
        }
        pixels.push(row);
    }
    
    return { width, height, pixels };
}

// Find most used colors in the image
function findDominantColors(pixels, maxColors = 64) {
    // Create a set of all unique colors in the image
    const allColors = new Set();
    
    // Extract all colors from the image
    for (const row of pixels) {
        for (const pixel of row) {
            // Quantize to Genesis color space (3-3-3)
            const r = Math.floor((pixel.r / 255) * 7);
            const g = Math.floor((pixel.g / 255) * 7);
            const b = Math.floor((pixel.b / 255) * 7);
            
            // Create a unique key for this color
            const key = `${r},${g},${b}`;
            allColors.add(key);
        }
    }
    
    console.log(`Found ${allColors.size} unique Genesis colors`);
    
    // If we have less than 64 colors, use all of them
    const colorArr = Array.from(allColors).map(colorKey => {
        const [r, g, b] = colorKey.split(',').map(Number);
        return {
            r: Math.round(r * 255 / 7),
            g: Math.round(g * 255 / 7),
            b: Math.round(b * 255 / 7)
        };
    });
    
    // If we have too many colors, select a representative subset
    let selectedColors = colorArr;
    if (colorArr.length > maxColors) {
        // Simple approach: divide the color space into 64 regions and pick one color from each
        const regions = new Array(maxColors).fill().map(() => []);
        
        // Define regions based on RGB values
        for (const color of colorArr) {
            // Map each color to one of the 64 regions
            const regionIndex = (
                Math.floor((color.r / 255) * 4) * 16 +
                Math.floor((color.g / 255) * 4) * 4 +
                Math.floor((color.b / 255) * 4)
            ) % maxColors;
            
            regions[regionIndex].push(color);
        }
        
        // Select one color from each region
        selectedColors = regions.map(region => {
            if (region.length === 0) {
                // If no colors in this region, return black
                return { r: 0, g: 0, b: 0 };
            }
            // Return the first color in this region
            return region[0];
        });
    }
    
    console.log(`Using ${selectedColors.length} colors for palette generation`);
    return selectedColors;
}

// Split colors into 4 palettes using k-means clustering
function createPalettes(dominantColors) {
    // Create a more diverse set of initial colors by quantizing to Genesis format
    const genesisColors = new Set();
    const genesisColorMap = new Map();
    
    // First pass: Convert all colors to Genesis format (9-bit)
    for (const color of dominantColors) {
        const r = Math.round((color.r / 255) * 7) & 0x7;
        const g = Math.round((color.g / 255) * 7) & 0x7;
        const b = Math.round((color.b / 255) * 7) & 0x7;
        
        const genesisColor = ((b & 0x7) << 9) | ((g & 0x7) << 5) | ((r & 0x7) << 1);
        const colorKey = `${r},${g},${b}`;
        
        if (!genesisColorMap.has(colorKey)) {
            genesisColorMap.set(colorKey, {
                r: r * 32, // Scale back to approximate 8-bit
                g: g * 32,
                b: b * 32,
                lab: rgbToLab(r * 32, g * 32, b * 32),
                originalRGB: color
            });
            genesisColors.add(colorKey);
        }
    }
    
    // Initialize empty palettes (4 palettes of 16 colors each)
    const palettes = Array(4).fill().map(() => []);
    
    // Convert set to array for processing
    const uniqueGenesisColors = Array.from(genesisColorMap.values());
    const numColors = uniqueGenesisColors.length;
    
    console.log(`Found ${numColors} unique Genesis colors after quantization`);
    
    // Initialize centroids with maximally distant colors to start
    const centroids = [
        { lab: uniqueGenesisColors[0].lab },
        { lab: uniqueGenesisColors[Math.min(Math.floor(numColors / 4), numColors - 1)].lab },
        { lab: uniqueGenesisColors[Math.min(Math.floor(numColors / 2), numColors - 1)].lab },
        { lab: uniqueGenesisColors[Math.min(Math.floor(3 * numColors / 4), numColors - 1)].lab }
    ];
    
    // K-means clustering with more iterations for better convergence
    for (let iteration = 0; iteration < 15; iteration++) {
        // Clear current palettes
        palettes.forEach(p => p.length = 0);
        
        // Assign colors to nearest centroid
        for (const color of uniqueGenesisColors) {
            let minDist = Infinity;
            let bestPalette = 0;
            
            for (let i = 0; i < centroids.length; i++) {
                const dist = deltaE(color.lab, centroids[i].lab);
                if (dist < minDist) {
                    minDist = dist;
                    bestPalette = i;
                }
            }
            
            if (palettes[bestPalette].length < 16) {
                palettes[bestPalette].push(color.originalRGB);
            } else {
                // If palette is full, find next best palette
                const distances = centroids.map((c, idx) => ({
                    distance: deltaE(color.lab, c.lab),
                    index: idx
                })).sort((a, b) => a.distance - b.distance);
                
                // Try all palettes in order of closest to furthest
                let assigned = false;
                for (const { index } of distances) {
                    if (palettes[index].length < 16) {
                        palettes[index].push(color.originalRGB);
                        assigned = true;
                        break;
                    }
                }
                
                // If still not assigned (all palettes full but we have remaining colors)
                // Replace the furthest color in the closest palette
                if (!assigned && uniqueGenesisColors.length <= 64) {
                    const targetPalette = distances[0].index;
                    
                    // Find the furthest color from the centroid
                    let furthestIdx = -1;
                    let furthestDist = -1;
                    
                    palettes[targetPalette].forEach((existingColor, idx) => {
                        const existingLab = rgbToLab(existingColor.r, existingColor.g, existingColor.b);
                        const dist = deltaE(existingLab, centroids[targetPalette].lab);
                        
                        if (dist > furthestDist) {
                            furthestDist = dist;
                            furthestIdx = idx;
                        }
                    });
                    
                    // If this color is closer to the centroid than the furthest one, replace it
                    if (furthestDist > minDist && furthestIdx !== -1) {
                        palettes[targetPalette][furthestIdx] = color.originalRGB;
                    }
                }
            }
        }
        
        // Update centroids
        for (let i = 0; i < centroids.length; i++) {
            if (palettes[i].length > 0) {
                const avgLab = palettes[i].reduce((acc, c) => {
                    const lab = rgbToLab(c.r, c.g, c.b);
                    return {
                        l: acc.l + lab.l / palettes[i].length,
                        a: acc.a + lab.a / palettes[i].length,
                        b: acc.b + lab.b / palettes[i].length
                    };
                }, { l: 0, a: 0, b: 0 });
                centroids[i] = { lab: avgLab };
            }
        }
    }
    
    // Ensure each palette has at least one color
    for (let i = 0; i < 4; i++) {
        if (palettes[i].length === 0 && uniqueGenesisColors.length > 0) {
            palettes[i].push(uniqueGenesisColors[0].originalRGB);
        }
    }
    
    // Ensure each palette has exactly 16 colors by duplicating or padding
    for (let i = 0; i < 4; i++) {
        while (palettes[i].length < 16) {
            if (palettes[i].length === 0) {
                // Add black as fallback if palette is empty
                palettes[i].push({ r: 0, g: 0, b: 0 });
            } else {
                // Duplicate an existing color
                palettes[i].push({...palettes[i][palettes[i].length % palettes[i].length]});
            }
        }
        
        // Truncate if needed
        if (palettes[i].length > 16) {
            palettes[i] = palettes[i].slice(0, 16);
        }
    }
    
    return palettes;
}

// Find best matching color from palettes
function findBestMatch(pixel, palettes) {
    const targetLab = rgbToLab(pixel.r, pixel.g, pixel.b);
    let bestMatch = { paletteIndex: 0, colorIndex: 0, distance: Infinity };
    
    for (let pi = 0; pi < palettes.length; pi++) {
        const palette = palettes[pi];
        for (let ci = 0; ci < palette.length; ci++) {
            const color = palette[ci];
            const colorLab = rgbToLab(color.r, color.g, color.b);
            const distance = deltaE(targetLab, colorLab);
            
            if (distance < bestMatch.distance) {
                bestMatch = {
                    paletteIndex: pi,
                    colorIndex: ci,
                    distance: distance
                };
            }
        }
    }
    
    return bestMatch;
}

// Convert full color BMP to indexed color using Genesis palettes
function convertToGenesisFormat(inputPath, outputPath) {
    console.log('Reading input BMP...');
    const bmp = readBMP(inputPath);
    
    console.log('Finding dominant colors...');
    const dominantColors = findDominantColors(bmp.pixels);
    
    console.log('Creating optimal palettes...');
    const palettes = createPalettes(dominantColors);
    
    // Convert palettes to Genesis format
    const genesisPalettes = palettes.map(palette => 
        palette.map(color => rgbToGenesis(color.r, color.g, color.b))
    );
    
    console.log('Creating indexed color map...');
    const indexedPixels = [];
    const tileAssignments = [];
    const tileSize = 8;
    
    // Process image in 8x8 tiles
    for (let ty = 0; ty < Math.ceil(bmp.height / tileSize); ty++) {
        const indexedRow = [];
        const assignmentRow = [];
        
        for (let tx = 0; tx < Math.ceil(bmp.width / tileSize); tx++) {
            // Collect colors in this tile
            const tileColors = new Set();
            const tilePixels = [];
            
            for (let y = 0; y < tileSize; y++) {
                for (let x = 0; x < tileSize; x++) {
                    const px = tx * tileSize + x;
                    const py = ty * tileSize + y;
                    if (px < bmp.width && py < bmp.height) {
                        const pixel = bmp.pixels[py][px];
                        tileColors.add(`${pixel.r},${pixel.g},${pixel.b}`);
                        tilePixels.push(pixel);
                    } else {
                        // For pixels outside the image, use black
                        tilePixels.push({ r: 0, g: 0, b: 0 });
                    }
                }
            }
            
            // Find best palette for this tile
            let bestPalette = 0;
            let lowestTotalDistance = Infinity;
            
            for (let pi = 0; pi < palettes.length; pi++) {
                let totalDistance = 0;
                for (const pixel of tilePixels) {
                    const targetLab = rgbToLab(pixel.r, pixel.g, pixel.b);
                    let minDistance = Infinity;
                    
                    for (const color of palettes[pi]) {
                        const colorLab = rgbToLab(color.r, color.g, color.b);
                        const distance = deltaE(targetLab, colorLab);
                        minDistance = Math.min(minDistance, distance);
                    }
                    totalDistance += minDistance;
                }
                
                if (totalDistance < lowestTotalDistance) {
                    lowestTotalDistance = totalDistance;
                    bestPalette = pi;
                }
            }
            
            // Map pixels to chosen palette
            const tile = [];
            for (let i = 0; i < tilePixels.length; i++) {
                // Use only the best palette for this tile
                const singlePalette = [palettes[bestPalette]];
                const match = findBestMatch(tilePixels[i], singlePalette);
                tile.push(match.colorIndex);
            }
            
            indexedRow.push(tile);
            assignmentRow.push(bestPalette);
        }
        
        indexedPixels.push(indexedRow);
        tileAssignments.push(assignmentRow);
    }
    
    // Create output data
    const result = {
        width: bmp.width,
        height: bmp.height,
        palettes: genesisPalettes,
        indexedPixels,
        tileAssignments
    };
    
    console.log('Writing JSON output...');
    writeFileSync(outputPath, JSON.stringify(result, null, 2));
    
    // Create and write the reduced color BMP
    const bmpOutputPath = outputPath.replace('.json', '.bmp');
    console.log('Writing reduced color BMP...');
    
    // Create a flat combined palette from all 4 palettes
    const combinedPalette = [];
    palettes.forEach((palette, paletteIndex) => {
        palette.forEach(color => {
            combinedPalette.push([color.r, color.g, color.b]);
        });
    });
    
    // Log palette information
    console.log('Palette information:');
    for (let i = 0; i < palettes.length; i++) {
        console.log(`Palette ${i}:`);
        palettes[i].forEach((color, j) => {
            console.log(`  Color ${j}: RGB(${color.r}, ${color.g}, ${color.b})`);
        });
    }
    
    // Create a flat pixel array for the BMP
    const flatPixels = new Array(bmp.width * bmp.height);
    
    // Fill pixel array based on indexed data and palette assignments
    for (let ty = 0; ty < indexedPixels.length; ty++) {
        for (let tx = 0; tx < indexedPixels[ty].length; tx++) {
            const tile = indexedPixels[ty][tx];
            const paletteIndex = tileAssignments[ty][tx];
            
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    const px = tx * 8 + x;
                    const py = ty * 8 + y;
                    
                    if (px < bmp.width && py < bmp.height) {
                        const pixelIndex = py * bmp.width + px;
                        const colorIndex = tile[y * 8 + x];
                        
                        // Calculate the global palette index (paletteIndex * 16 + colorIndex)
                        flatPixels[pixelIndex] = paletteIndex * 16 + colorIndex;
                    }
                }
            }
        }
    }
    
    // Save BMP with indexed colors
    saveBMP(bmp.width, bmp.height, flatPixels, combinedPalette, bmpOutputPath);    console.log('Conversion complete!');
    
    // Print palette statistics
    console.log('\nPalette Statistics:');
    palettes.forEach((palette, i) => {
        console.log(`Palette ${i}: ${palette.length} colors`);
    });
    
    return result;
}

// Check command line arguments
if (process.argv.length < 4) {
    console.log('Usage: node colorReduce.js <input.bmp> <output.json>');
    process.exit(1);
}

// Convert image
const inputPath = process.argv[2];
const outputPath = process.argv[3];
convertToGenesisFormat(inputPath, outputPath);
