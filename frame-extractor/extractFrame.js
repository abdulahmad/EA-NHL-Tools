#!/usr/bin/env node
/**
 * NHL95 Frame Data Extractor
 * 
 * This script extracts frame data from NHL95 Sega Genesis ROM.
 * It follows the logic of the addframe2 function from the game's assembly code.
 * 
 * Usage: node extractFrame.js <rom_file> <frame_number>
 */

const fs = require('fs');
const path = require('path');

// Constants from the assembly code
// const FRAME_TABLE_ADDRESS = 0xCA56A; // Base address for frame pointers
const FRAME_TABLE_ADDRESS = 0x1318F4; // Base address for frame pointers 
const SIZE_TABLE_ADDRESS = 0x79F50;  // Size table address for sprite sizes

// Helper function to read a 16-bit word (big-endian)
function readWord(buffer, offset) {
    return (buffer[offset] << 8) | buffer[offset + 1];
}

// Helper function to read a 32-bit long word (big-endian)
function readLongWord(buffer, offset) {
    return (buffer[offset] << 24) | (buffer[offset + 1] << 16) | 
           (buffer[offset + 2] << 8) | buffer[offset + 3];
}

// Helper function to format value as hexadecimal
function toHex(value, digits = 2) {
    return '0x' + value.toString(16).toUpperCase().padStart(digits, '0');
}

// Main function to extract frame data
function extractFrameData(romBuffer, frameNumber) {
    console.log(`Extracting data for frame ${frameNumber} (${toHex(frameNumber, 4)})`);
    
    // Calculate frame table offset: frame * 4
    const frameOffset = frameNumber * 4;
    
    const startSpriteData = 132136;
    // Get the frame pointer from the frame table
    const framePointerOffset = FRAME_TABLE_ADDRESS - 4 + frameOffset;
    const framePointer = readWord(romBuffer, framePointerOffset);
    const nextFramePointer = readWord(romBuffer, framePointerOffset+2);
    
    console.log(`Frame pointer found at ${toHex(framePointerOffset, 6)}: ${toHex(framePointer, 8)}`);
    console.log(`Next Frame pointer found at ${toHex(framePointerOffset+2, 6)}: ${toHex(nextFramePointer, 8)}`);
    if (framePointer === 0) {
        console.error('Frame pointer is null (0x00000000). This frame may not exist.');
        return;
    }
    // throw new Error(`Frame pointer is null (0x00000000). This frame may not exist.`);
    // Read the number of sprites in the frame
    // const numSprites = startSpriteData+readWord(romBuffer, framePointer);
    const numSprites = (nextFramePointer - framePointer) / 8
    console.log(`Number of sprites in frame: ${numSprites}`);
    
    // The sprite data starts 4 bytes after the frame pointer
    let spriteDataOffset = startSpriteData + framePointer;
    
    // Process each sprite in the frame
    for (let i = 0; i < numSprites; i++) {
        console.log(`\nSprite ${i + 1}/${numSprites}:`);
        
        // Read sprite data (8 bytes per sprite entry)
        const yOffset = readWord(romBuffer, spriteDataOffset);
        const sizeFormat = romBuffer[spriteDataOffset + 2];
        // Byte at offset +3 appears unused in the assembly
        const tileIndex = readWord(romBuffer, spriteDataOffset + 4);
        const xOffset = readWord(romBuffer, spriteDataOffset + 6);
        
        // Get sprite size info
        const sizeTabIndex = sizeFormat & 0x0F;
        const sizeValue = romBuffer[SIZE_TABLE_ADDRESS + sizeTabIndex];
        
        // Calculate width and height from size format
        const heightBits = sizeFormat & 0x03;
        const widthBits = (sizeFormat & 0x0C) >> 2;
        const height = (heightBits + 1) * 8;
        const width = ((widthBits + 1) * 8);
        
        // Output sprite info
        console.log(`  Y Offset: ${yOffset} (${toHex(yOffset, 4)})`);
        console.log(`  X Offset: ${xOffset} (${toHex(xOffset, 4)})`);
        console.log(`  Size/Format: ${toHex(sizeFormat, 2)}`);
        console.log(`    Width: ${width} pixels (${widthBits + 1} tiles)`);
        console.log(`    Height: ${height} pixels (${heightBits + 1} tiles)`);
        console.log(`  Tile Index: ${tileIndex & 0x07FF} (${toHex(tileIndex & 0x07FF, 4)})`);
        console.log(`  Tile Count: ${sizeValue}`);
        
        // Additional attribute bits from tile index
        const paletteFlipBits = tileIndex & 0xF800;
        if (paletteFlipBits > 0) {
            console.log(`  Attributes: ${toHex(paletteFlipBits, 4)}`);
            if (paletteFlipBits & 0x8000) console.log('    - Horizontal Flip');
            if (paletteFlipBits & 0x4000) console.log('    - Vertical Flip');
            if (paletteFlipBits & 0x3000) console.log(`    - Palette: ${(paletteFlipBits & 0x3000) >> 12}`);
            if (paletteFlipBits & 0x0800) console.log('    - Priority');
        }
        
        // Move to the next sprite
        spriteDataOffset += 8;
    }
}

// Main script execution
function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.error('Usage: node extractFrame.js <rom_file> <frame_number>');
        process.exit(1);
    }
    
    const romFilePath = args[0];
    const frameNumber = parseInt(args[1], 10);
    
    if (isNaN(frameNumber) || frameNumber < 1) {
        console.error('Frame number must be a positive integer');
        process.exit(1);
    }
    
    console.log(`Reading ROM file: ${romFilePath}`);
    
    try {
        const romBuffer = fs.readFileSync(romFilePath);
        extractFrameData(romBuffer, frameNumber);
    } catch (error) {
        console.error(`Error reading ROM file: ${error.message}`);
        process.exit(1);
    }
}

main();
