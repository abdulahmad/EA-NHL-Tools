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
function processBMP(inputPath) {
    try {
        console.log(`Processing ${inputPath}...`);
        
        // Create output directory
        const inputFileName = basename(inputPath, '.bmp');
        const outputDir = join(dirname(inputPath), '3bit-converted');
        mkdirSync(outputDir, { recursive: true });
        
        // Read the BMP file
        const { width, height, pixels } = readBMP(inputPath);
        
        // Convert each pixel's color to 3-bit and back
        const convertedPixels = [];
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                const [r, g, b] = pixels[y][x];
                const [r3, g3, b3] = convertTo3BitAndBack(r, g, b);
                row.push([r3, g3, b3]);
            }
            convertedPixels.push(row);
        }
        
        // Save the converted image
        const outputPath = join(outputDir, `${inputFileName}-3bit.bmp`);
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
    console.log('Usage: node bmp3bitConverter.js <path-to-bmp-file>');
    process.exit(1);
}

// Get file path and run conversion
const bmpPath = process.argv[2];
processBMP(bmpPath);
