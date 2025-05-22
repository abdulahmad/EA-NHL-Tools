// Generate a simple gradient test BMP file for testing the dithering feature

import { writeFileSync } from 'fs';

// Create a 256x256 BMP with a simple gradient
const width = 256;
const height = 256;

// BMP file structure
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

// Generate gradient pixel data
console.log('Generating gradient test image...');

for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
        // Create a gradient where:
        // - Red increases from left to right
        // - Green increases from top to bottom
        // - Blue creates a diagonal gradient
        const r = Math.floor((x / width) * 255);
        const g = Math.floor((y / height) * 255);
        const b = Math.floor(((x + y) / (width + height)) * 255);
        
        const offset = headerSize + y * rowSize + x * 3;
        bmp.writeUInt8(b, offset); // Blue
        bmp.writeUInt8(g, offset + 1); // Green
        bmp.writeUInt8(r, offset + 2); // Red
    }
    
    // Pad row to multiple of 4 bytes
    const paddingOffset = headerSize + y * rowSize + width * 3;
    const paddingBytes = rowSize - (width * 3);
    for (let p = 0; p < paddingBytes; p++) {
        bmp.writeUInt8(0, paddingOffset + p);
    }
}

// Save the BMP file
const outputFilePath = 'test-gradient.bmp';
writeFileSync(outputFilePath, bmp);

console.log(`Generated test gradient BMP at: ${outputFilePath}`);
console.log('You can now run: node test-dithering.js test-gradient.bmp');
