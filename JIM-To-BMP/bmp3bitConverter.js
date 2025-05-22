import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Convert 8-bit RGB (0-255) to 3-bit (0-7) and back to 8-bit
// This simulates how colors would look in the Genesis color space
function convertTo3BitAndBack(r, g, b) {
    // Convert from 8-bit (0-255) to 3-bit (0-7)
    // Use Math.min to avoid overflow and ensure proper rounding
    const r3 = Math.min(7, Math.round(r / (255/7)));
    const g3 = Math.min(7, Math.round(g / (255/7)));
    const b3 = Math.min(7, Math.round(b / (255/7)));

    // Convert back from 3-bit (0-7) to 8-bit (0-255)
    // Using the scaling factor 255/7 exactly as in extractJimFull.js
    return [
        Math.round(r3 * 255 / 7),
        Math.round(g3 * 255 / 7),
        Math.round(b3 * 255 / 7)
    ];
}

// Convert 8-bit RGB (0-255) to N-bit (0 to 2^N-1)
// Returns the values in the N-bit color space, not converted back to 8-bit
function convertToNBit(r, g, b, bits) {
    // Skip conversion if bits is 8 (already at full color)
    if (bits === 8) return [r, g, b];
    
    // Calculate the max value for N bits (2^N - 1)
    const maxValue = (1 << bits) - 1;
    
    // Convert from 8-bit (0-255) to N-bit
    const rN = Math.round((r / 255) * maxValue);
    const gN = Math.round((g / 255) * maxValue);
    const bN = Math.round((b / 255) * maxValue);
    
    return [rN, gN, bN];
}

// Convert N-bit color value back to 8-bit (0-255)
function convertFromNBitTo8Bit(value, bits) {
    const maxValue = (1 << bits) - 1;
    return Math.round((value / maxValue) * 255);
}

// A 8x8 Bayer matrix for better dithering patterns
const BAYER_MATRIX_8X8 = [
    [0, 32, 8, 40, 2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21]
];

// Normalize the Bayer matrix to 0.0-1.0 range for easier use
const BAYER_NORMALIZED = BAYER_MATRIX_8X8.map(row => row.map(v => v / 64));

// Dither a color component from N-bit color space to 3-bit (0-7)
function ditherTo3Bit(value, maxValue, x, y) {
    // Convert from N-bit to 0-1 range for proper dithering
    const normalizedValue = value / maxValue;
    
    // Scale to 3-bit range (0-7)
    const scaledValue = normalizedValue * 7;
    
    // Find the closest lower and upper 3-bit values
    const lowerValue = Math.floor(scaledValue);
    const upperValue = Math.min(7, lowerValue + 1);
    
    // If the value exactly matches a 3-bit value, no dithering needed
    if (scaledValue === lowerValue) {
        return lowerValue;
    }
    
    // Calculate how far the value is between lower and upper (0.0 to 1.0)
    const distance = scaledValue - lowerValue;
    
    // Get the threshold from the Bayer matrix based on pixel position
    const threshold = BAYER_NORMALIZED[y % 8][x % 8];
    
    // Choose upper or lower value based on threshold comparison
    return distance > threshold ? upperValue : lowerValue;
}

// Apply dithering to convert to 3-bit color space
function applyDithering(pixels, ditheredPixels, ditherBits) {
    const height = pixels.length;
    const width = pixels[0].length;
    
    // Calculate max value for the N-bit color space
    const maxValue = (1 << ditherBits) - 1;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const [r, g, b] = pixels[y][x];
            
            // First convert to N-bit color space (dithering source)
            const [rN, gN, bN] = convertToNBit(r, g, b, ditherBits);
            
            // Apply dithering to get 3-bit color values
            const r3 = ditherTo3Bit(rN, maxValue, x, y);
            const g3 = ditherTo3Bit(gN, maxValue, x, y);
            const b3 = ditherTo3Bit(bN, maxValue, x, y);
            
            // Convert the 3-bit values back to 8-bit for storage/display
            const r8 = Math.round(r3 * 255 / 7);
            const g8 = Math.round(g3 * 255 / 7);
            const b8 = Math.round(b3 * 255 / 7);
            
            ditheredPixels[y][x] = [r8, g8, b8];
        }
    }
    
    return ditheredPixels;
}

// Get colors in a specific region of the image with their frequencies
function getColorsInRegion(pixels, left, top, right, bottom) {
    const colorMap = new Map();
    
    for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
            const color = pixels[y][x].toString();
            if (!colorMap.has(color)) {
                colorMap.set(color, 0);
            }
            colorMap.set(color, colorMap.get(color) + 1);
        }
    }
    
    // Convert map to sorted array of [color, frequency] pairs
    const sortedColors = Array.from(colorMap.entries()).sort((a, b) => b[1] - a[1]);
    
    return sortedColors.map(entry => ({ color: entry[0].split(',').map(Number), frequency: entry[1] }));
}

// Apply Floyd-Steinberg error diffusion dithering
function applyDiffusionDithering(pixels, ditheredPixels, ditherBits, diffusionStrength = 1.0) {
    const height = pixels.length;
    const width = pixels[0].length;
    
    // Calculate max value for the N-bit color space
    const maxValue = (1 << ditherBits) - 1;
    
    // Create a copy of pixels to track errors (use floating point values)
    const workingPixels = [];
    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            const [r, g, b] = pixels[y][x];
            // First convert to N-bit color space (dithering source)
            const [rN, gN, bN] = convertToNBit(r, g, b, ditherBits);
            // Store as normalized 0.0-1.0 values
            row.push([rN/maxValue, gN/maxValue, bN/maxValue]);
        }
        workingPixels.push(row);
    }
    
    // Apply Floyd-Steinberg error diffusion
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const [oldR, oldG, oldB] = workingPixels[y][x];
            
            // Quantize to 3-bit color (0-7)
            const r3 = Math.min(7, Math.max(0, Math.round(oldR * 7)));
            const g3 = Math.min(7, Math.max(0, Math.round(oldG * 7)));
            const b3 = Math.min(7, Math.max(0, Math.round(oldB * 7)));
            
            // Convert back to 8-bit for output
            const r8 = Math.round(r3 * 255 / 7);
            const g8 = Math.round(g3 * 255 / 7);
            const b8 = Math.round(b3 * 255 / 7);
            
            // Save the dithered pixel
            ditheredPixels[y][x] = [r8, g8, b8];
            
            // Calculate quantization error
            const errorR = oldR - (r3 / 7);
            const errorG = oldG - (g3 / 7);
            const errorB = oldB - (b3 / 7);
            
            // Distribute error to neighboring pixels with diffusion strength factor
            const strength = diffusionStrength * 0.5; // Scale factor to dampen the effect
            
            // Floyd-Steinberg diffusion pattern:
            //   *   7/16
            // 3/16 5/16 1/16
            
            // Right pixel (7/16)
            if (x + 1 < width) {
                workingPixels[y][x + 1][0] += errorR * (7/16) * strength;
                workingPixels[y][x + 1][1] += errorG * (7/16) * strength;
                workingPixels[y][x + 1][2] += errorB * (7/16) * strength;
            }
            
            if (y + 1 < height) {
                // Bottom-left pixel (3/16)
                if (x - 1 >= 0) {
                    workingPixels[y + 1][x - 1][0] += errorR * (3/16) * strength;
                    workingPixels[y + 1][x - 1][1] += errorG * (3/16) * strength;
                    workingPixels[y + 1][x - 1][2] += errorB * (3/16) * strength;
                }
                
                // Bottom pixel (5/16)
                workingPixels[y + 1][x][0] += errorR * (5/16) * strength;
                workingPixels[y + 1][x][1] += errorG * (5/16) * strength;
                workingPixels[y + 1][x][2] += errorB * (5/16) * strength;
                
                // Bottom-right pixel (1/16)
                if (x + 1 < width) {
                    workingPixels[y + 1][x + 1][0] += errorR * (1/16) * strength;
                    workingPixels[y + 1][x + 1][1] += errorG * (1/16) * strength;
                    workingPixels[y + 1][x + 1][2] += errorB * (1/16) * strength;
                }
            }
        }
    }
    
    return ditheredPixels;
}

// Apply noise dithering
function applyNoiseDithering(pixels, ditheredPixels, ditherBits, noiseAmount = 0.5) {
    const height = pixels.length;
    const width = pixels[0].length;
    
    // Calculate max value for the N-bit color space
    const maxValue = (1 << ditherBits) - 1;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const [r, g, b] = pixels[y][x];
            
            // First convert to N-bit color space (dithering source)
            const [rN, gN, bN] = convertToNBit(r, g, b, ditherBits);
            
            // Apply noise to each color channel
            const noiseR = (Math.random() - 0.5) * noiseAmount * 2;
            const noiseG = (Math.random() - 0.5) * noiseAmount * 2;
            const noiseB = (Math.random() - 0.5) * noiseAmount * 2;
            
            // Add noise and quantize to 3-bit (0-7)
            const r3 = Math.min(7, Math.max(0, Math.round(rN / maxValue * 7 + noiseR)));
            const g3 = Math.min(7, Math.max(0, Math.round(gN / maxValue * 7 + noiseG)));
            const b3 = Math.min(7, Math.max(0, Math.round(bN / maxValue * 7 + noiseB)));
            
            // Convert back to 8-bit for output
            const r8 = Math.round(r3 * 255 / 7);
            const g8 = Math.round(g3 * 255 / 7);
            const b8 = Math.round(b3 * 255 / 7);
            
            ditheredPixels[y][x] = [r8, g8, b8];
        }
    }
    
    return ditheredPixels;
}

// Read a BMP file and parse its header and data
function readBMP(filepath) {
    const buffer = readFileSync(filepath);
    
    // Read BMP header
    const headerField = buffer.toString('ascii', 0, 2);
    if (headerField !== 'BM') {
        throw new Error('Not a valid BMP file');
    }
    
    // Get basic info from header
    const fileSize = buffer.readUInt32LE(2);
    const pixelDataOffset = buffer.readUInt32LE(10);
    const dibHeaderSize = buffer.readUInt32LE(14);
    const width = buffer.readInt32LE(18);
    const height = Math.abs(buffer.readInt32LE(22)); // Absolute value in case it's negative (top-down)
    const isTopDown = buffer.readInt32LE(22) < 0;
    const bitsPerPixel = buffer.readUInt16LE(28);
    const compression = buffer.readUInt32LE(30);
    
    if (compression !== 0) {
        throw new Error('Compressed BMP files are not supported');
    }
    
    console.log(`BMP Info: ${width}x${height}, ${bitsPerPixel} bits per pixel`);
    
    // Extract pixel data
    const pixels = [];
    const rowSize = Math.floor((bitsPerPixel * width + 31) / 32) * 4;
    
    // Read pixel data
    if (bitsPerPixel === 24) {
        // 24-bit BMP (RGB data)
        for (let y = 0; y < height; y++) {
            const row = [];
            const rowIndex = isTopDown ? y : (height - 1 - y);
            
            for (let x = 0; x < width; x++) {
                const pixelOffset = pixelDataOffset + rowIndex * rowSize + x * 3;
                const b = buffer[pixelOffset];
                const g = buffer[pixelOffset + 1];
                const r = buffer[pixelOffset + 2];
                row.push([r, g, b]);
            }
            pixels.push(row);
        }
    } else if (bitsPerPixel === 8) {
        // 8-bit indexed color - read palette first
        const palette = [];
        for (let i = 0; i < 256; i++) {
            const paletteOffset = 14 + dibHeaderSize + i * 4;
            const b = buffer[paletteOffset];
            const g = buffer[paletteOffset + 1];
            const r = buffer[paletteOffset + 2];
            palette.push([r, g, b]);
        }
        
        // Read indexed pixels
        for (let y = 0; y < height; y++) {
            const row = [];
            const rowIndex = isTopDown ? y : (height - 1 - y);
            
            for (let x = 0; x < width; x++) {
                const pixelOffset = pixelDataOffset + rowIndex * rowSize + x;
                const colorIndex = buffer[pixelOffset];
                row.push(palette[colorIndex]);
            }
            pixels.push(row);
        }
    } else {
        throw new Error(`Unsupported BMP format: ${bitsPerPixel} bits per pixel`);
    }
    
    return { width, height, pixels, bitsPerPixel };
}

// Save a 24-bit BMP file
function saveBMP(width, height, pixels, filepath) {
    const headerSize = 14 + 40; // BMP header + DIB header
    const rowSize = Math.ceil(width * 3 / 4) * 4; // Each row is padded to multiple of 4 bytes
    const pixelDataSize = rowSize * height;
    const fileSize = headerSize + pixelDataSize;
    
    const bmp = Buffer.alloc(fileSize);
    
    // BMP Header
    bmp.write('BM', 0); // Magic number
    bmp.writeUInt32LE(fileSize, 2); // File size
    bmp.writeUInt32LE(0, 6); // Reserved
    bmp.writeUInt32LE(headerSize, 10); // Pixel data offset
    
    // DIB Header
    bmp.writeUInt32LE(40, 14); // DIB header size
    bmp.writeInt32LE(width, 18); // Width
    bmp.writeInt32LE(-height, 22); // Height (negative for top-down)
    bmp.writeUInt16LE(1, 26); // Color planes
    bmp.writeUInt16LE(24, 28); // Bits per pixel (24 for RGB)
    bmp.writeUInt32LE(0, 30); // No compression
    bmp.writeUInt32LE(pixelDataSize, 34); // Image size
    bmp.writeUInt32LE(0, 38); // H-DPI
    bmp.writeUInt32LE(0, 42); // V-DPI
    bmp.writeUInt32LE(0, 46); // Colors in palette (0 = 2^n)
    bmp.writeUInt32LE(0, 50); // Important colors (0 = all)
    
    // Write pixel data
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const color = pixels[y][x];
            const offset = headerSize + y * rowSize + x * 3;
            bmp.writeUInt8(color[2], offset); // Blue
            bmp.writeUInt8(color[1], offset + 1); // Green
            bmp.writeUInt8(color[0], offset + 2); // Red
        }
        
        // Pad row to multiple of 4 bytes
        const paddingOffset = headerSize + y * rowSize + width * 3;
        const paddingBytes = rowSize - (width * 3);
        for (let p = 0; p < paddingBytes; p++) {
            bmp.writeUInt8(0, paddingOffset + p);
        }
    }
    
    writeFileSync(filepath, bmp);
}

// Main function to process a BMP file
function processBMP(inputPath, options = {}) {
    try {
        console.log(`Processing ${inputPath}...`);
        
        // Create output directory
        const inputFileName = basename(inputPath, '.bmp');
        const outputDir = join(dirname(inputPath), '3bit-converted');
        mkdirSync(outputDir, { recursive: true });
        
        // Read the BMP file
        const { width, height, pixels } = readBMP(inputPath);
        
        // Initialize the array for converted pixels
        const convertedPixels = Array(height).fill().map(() => Array(width).fill(null));
          // Check if dithering is enabled and what bit depth to use
        if (options.dither) {
            const ditherDepth = parseInt(options.dither);
            console.log(`Using ${ditherDepth}-bit dithering with ${options.ditherType || 'pattern'} method`);
            
            // Apply the appropriate dithering method
            if (options.ditherType === 'diffusion') {
                const strength = options.diffusionStrength || 1.0;
                console.log(`Diffusion strength: ${strength}`);
                applyDiffusionDithering(pixels, convertedPixels, ditherDepth, strength);
            } else if (options.ditherType === 'noise') {
                const noiseAmount = options.noiseAmount || 0.5;
                console.log(`Noise amount: ${noiseAmount}`);
                applyNoiseDithering(pixels, convertedPixels, ditherDepth, noiseAmount);
            } else {
                // Default to pattern (Bayer) dithering
                console.log('Using pattern (Bayer) dithering');
                applyDithering(pixels, convertedPixels, ditherDepth);
            }
        } else {
            // Standard non-dithered conversion
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const [r, g, b] = pixels[y][x];
                    const [r3, g3, b3] = convertTo3BitAndBack(r, g, b);
                    convertedPixels[y][x] = [r3, g3, b3];
                }
            }
        }
          // Determine output filename
        const ditherSuffix = options.dither ? `-dither${options.dither}bit` : '';
        const methodSuffix = options.ditherType ? `-${options.ditherType}` : '';
        const strengthSuffix = options.ditherType === 'diffusion' && options.diffusionStrength ? 
                             `-s${options.diffusionStrength}` : 
                             (options.ditherType === 'noise' && options.noiseAmount ? 
                             `-n${options.noiseAmount}` : '');
        
        const outputPath = join(outputDir, `${inputFileName}-3bit${ditherSuffix}${methodSuffix}${strengthSuffix}.bmp`);
        
        // Save the converted image
        saveBMP(width, height, convertedPixels, outputPath);
        
        console.log(`Successfully created 3-bit color version at: ${outputPath}`);
        return outputPath;
    } catch (error) {
        console.error(`Error processing BMP file: ${error.message}`);
        console.error(error.stack);
        return null;
    }
}

// Check command line arguments
if (process.argv.length < 3) {
    console.log('Usage: node bmp3bitConverter.js <path-to-bmp-file> [options]');
    console.log('Options:');
    console.log('  -dither=<4bit|5bit|6bit|7bit|8bit>    Apply dithering with specified bit depth');
    console.log('  -method=<pattern|diffusion|noise>     Dithering method (default: pattern)');
    console.log('  -strength=<value>                     Diffusion strength (0.1-2.0, default: 1.0)');
    console.log('  -noise=<value>                        Noise amount (0.1-1.0, default: 0.5)');
    console.log('');
    console.log('Examples:');
    console.log('  node bmp3bitConverter.js image.bmp -dither=6bit -method=diffusion -strength=0.8');
    console.log('  node bmp3bitConverter.js image.bmp -dither=5bit -method=noise -noise=0.4');
    process.exit(1);
}

// Parse command line options
const options = {};
const bmpPath = process.argv[2];

// Parse any additional options
for (let i = 3; i < process.argv.length; i++) {
    const arg = process.argv[i];
    
    if (arg.startsWith('-dither=')) {
        const ditherValue = arg.substring(8);
        // Validate dither value
        const validValues = ['4bit', '5bit', '6bit', '7bit', '8bit'];
        if (validValues.includes(ditherValue)) {
            options.dither = parseInt(ditherValue.replace('bit', ''));
        } else {
            console.warn(`Warning: Invalid dither value '${ditherValue}'. Using no dithering.`);
        }
    } else if (arg.startsWith('-method=')) {
        const method = arg.substring(8).toLowerCase();
        // Validate method
        const validMethods = ['pattern', 'diffusion', 'noise'];
        if (validMethods.includes(method)) {
            options.ditherType = method;
        } else {
            console.warn(`Warning: Invalid dithering method '${method}'. Using default method 'pattern'.`);
            options.ditherType = 'pattern';
        }
    } else if (arg.startsWith('-strength=')) {
        const strength = parseFloat(arg.substring(10));
        if (!isNaN(strength) && strength > 0) {
            options.diffusionStrength = Math.min(2.0, Math.max(0.1, strength));
        } else {
            console.warn(`Warning: Invalid diffusion strength '${arg.substring(10)}'. Using default 1.0.`);
            options.diffusionStrength = 1.0;
        }
    } else if (arg.startsWith('-noise=')) {
        const noise = parseFloat(arg.substring(7));
        if (!isNaN(noise) && noise > 0) {
            options.noiseAmount = Math.min(1.0, Math.max(0.1, noise));
        } else {
            console.warn(`Warning: Invalid noise amount '${arg.substring(7)}'. Using default 0.5.`);
            options.noiseAmount = 0.5;
        }
    }
}

// Run the conversion with options
processBMP(bmpPath, options);
