/**
 * NHL95 Frame Reader
 * 
 * This script reads player animation frames from the NHL95 ROM
 * and displays the sprite data information.
 * 
 * Usage: node nhl95FrameReader.js <romFilePath> <frameNumber>
 */

const fs = require('fs');
const path = require('path');

// Constants for NHL95
const SIZETAB_OFFSET = 0x79F50;
const FRAME_DATA_TABLE = 0x1318F4;  // From existing anim95ToBmp.js
const SPRITE_TILES_OFFSET = 0xCA574; // From existing anim95ToBmp.js

// Read command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node nhl95FrameReader.js <romFilePath> <frameNumber>');
  process.exit(1);
}

const romFilePath = args[0];
const frameNumber = parseInt(args[1], 10);

// Check if frame number is valid
if (isNaN(frameNumber) || frameNumber < 0) {
  console.error('Frame number must be a positive integer');
  process.exit(1);
}

// Read ROM file
let romData;
try {
  romData = fs.readFileSync(romFilePath);
  console.log(`ROM file loaded: ${romFilePath} (${romData.length} bytes)`);
  // Write to a log file as well for debugging
  fs.writeFileSync(
    path.join(__dirname, 'frame-reader-log.txt'), 
    `ROM file loaded: ${romFilePath} (${romData.length} bytes)\n`
  );
} catch (error) {
  console.error(`Error reading ROM file: ${error.message}`);
  fs.writeFileSync(
    path.join(__dirname, 'frame-reader-error.txt'), 
    `Error reading ROM file: ${error.message}\n`
  );
  process.exit(1);
}

// Read size table
const sizeTable = [];
for (let i = 0; i < 16; i++) {
  sizeTable.push(romData[SIZETAB_OFFSET + i]);
}
console.log('Size Table at 0x' + SIZETAB_OFFSET.toString(16) + ':', sizeTable);

/**
 * NHL95 Frame/Sprite Data Format:
 * 
 * 1. Frame data table at 0x1318F4
 *    - Contains 2-byte entries pointing to sprite data offsets
 * 
 * 2. Frame Data Structure:
 *    - Sprite data is stored as 8-byte entries
 *    - The number of sprites in a frame is calculated by comparing offsets
 * 
 * 3. Sprite Data Entry (8 bytes per sprite):
 *    - Bytes 0-1: Y position offset
 *    - Byte 2: Size and shape information
 *      - Bits 0-1: Y size (height in tiles - 1)
 *      - Bits 2-3: X size (width in tiles - 1)
 *      - Bits 4-7: Used for other attributes
 *    - Byte 3: Reserved/unused
 *    - Bytes 4-5: Contains:
 *      - Bits 0-10: Tile index into the sprite tiles area
 *      - Bits 11-15: Palette information
 *    - Bytes 6-7: X position offset
 */

// Helper functions to read data from ROM
function readByte(offset) {
  return romData[offset];
}

function readWord(offset) {
  return (romData[offset] << 8) | romData[offset + 1];
}

function readSignedWord(offset) {
  let value = readWord(offset);
  // Convert to signed 16-bit
  if (value & 0x8000) {
    value = value - 0x10000;
  }
  return value;
}

// Get frame data offsets
const frameOffset = FRAME_DATA_TABLE + (frameNumber * 2);
console.log(`\nFrame ${frameNumber} entry at offset: 0x${frameOffset.toString(16)}`);

const frameDataOffset = readWord(frameOffset) + FRAME_DATA_TABLE - 2; // Adjust as per anim95ToBmp.js
console.log(`Frame data offset: 0x${frameDataOffset.toString(16)}`);

// Get next frame offset to calculate number of sprites
const nextFrameOffset = readWord(frameOffset + 2) + FRAME_DATA_TABLE - 2;
console.log(`Next frame data offset: 0x${nextFrameOffset.toString(16)}`);

// Calculate number of sprites (8 bytes per sprite)
const numSprites = (nextFrameOffset - frameDataOffset) / 8;
console.log(`\nFrame ${frameNumber} contains ${numSprites} sprites`);

// Read sprite data
let spriteDataOffset = frameDataOffset;
console.log('\nSprite Data:');
console.log('============');

for (let i = 0; i < numSprites; i++) {
  console.log(`\nSprite ${i}:`);
  
  // Read Y position offset
  const yOffset = readSignedWord(spriteDataOffset);
  console.log(`  Y Offset: ${yOffset} (0x${yOffset.toString(16).replace('-', '-0x')}) [Offset: 0x${spriteDataOffset.toString(16)}]`);
  
  // Read size/shape byte
  const sizeShape = readByte(spriteDataOffset + 2);
  const ySize = (sizeShape & 0x03) + 1;
  const xSize = ((sizeShape >> 2) & 0x03) + 1;
  console.log(`  Size/Shape: 0x${sizeShape.toString(16)} [Offset: 0x${(spriteDataOffset + 2).toString(16)}]`);
  console.log(`    Y Size: ${ySize} tile(s) (${ySize * 8} pixels)`);
  console.log(`    X Size: ${xSize} tile(s) (${xSize * 8} pixels)`);
  
  // Read attribute byte
  const attributeByte = readByte(spriteDataOffset + 3);
  console.log(`  Attribute Byte: 0x${attributeByte.toString(16)} [Offset: 0x${(spriteDataOffset + 3).toString(16)}]`);
  
  // Read pattern/palette data
  const tileLocByte = readWord(spriteDataOffset + 4);
  const tileIndex = tileLocByte & 0x07FF;
  const palette = (tileLocByte >> 11) & 0x1F;
  console.log(`  Tile Location: 0x${tileLocByte.toString(16)} [Offset: 0x${(spriteDataOffset + 4).toString(16)}]`);
  console.log(`    Tile Index: ${tileIndex} (0x${tileIndex.toString(16)})`);
  console.log(`    Palette: ${palette} (0x${palette.toString(16)})`);
  
  // Read X position offset
  const xOffset = readSignedWord(spriteDataOffset + 6);
  console.log(`  X Offset: ${xOffset} (0x${xOffset.toString(16).replace('-', '-0x')}) [Offset: 0x${(spriteDataOffset + 6).toString(16)}]`);
  
  // Get number of tiles based on size info
  const sizeIndex = sizeShape & 0x0F;
  const tileCount = sizeTable[sizeIndex];
  console.log(`  Tile Count: ${tileCount} tiles (size index: ${sizeIndex})`);
  
  // Calculate tile data address
  const tileDataAddress = SPRITE_TILES_OFFSET + (tileIndex * 32); // Each tile is 32 bytes
  console.log(`  Tile Data Address: 0x${tileDataAddress.toString(16)}`);
  
  // Move to next sprite
  spriteDataOffset += 8;
}

/**
 * Port of addframe2 function for NHL95
 * 
 * The addframe2 function in NHL95:
 * 1. Gets frame data from the frame table
 * 2. For each sprite in the frame:
 *    - Reads sprite data (position, size, tile index)
 *    - Handles flipping based on attributes
 *    - Transfers tile data to VRAM
 *    - Sets up sprite attributes
 */

console.log('\n--- addframe2 Function Simulation ---');

// Simulate a basic version of addframe2
function simulateAddframe2(frameNum) {
  console.log(`Processing frame ${frameNum}`);
  
  // Get frame data offset
  const frameOffset = FRAME_DATA_TABLE + (frameNum * 2);
  const frameDataOffset = readWord(frameOffset) + FRAME_DATA_TABLE - 2;
  const nextFrameOffset = readWord(frameOffset + 2) + FRAME_DATA_TABLE - 2;
  const numSprites = (nextFrameOffset - frameDataOffset) / 8;
  
  console.log(`Frame data at 0x${frameDataOffset.toString(16)}, contains ${numSprites} sprites`);
  
  // Process each sprite
  let spriteDataOffset = frameDataOffset;
  for (let spriteIndex = 0; spriteIndex < numSprites; spriteIndex++) {
    // Read sprite data
    const yOffset = readSignedWord(spriteDataOffset);
    const sizeShape = readByte(spriteDataOffset + 2);
    const attributeByte = readByte(spriteDataOffset + 3);
    const tileLocByte = readWord(spriteDataOffset + 4);
    const xOffset = readSignedWord(spriteDataOffset + 6);
    
    // Extract key data
    const ySize = (sizeShape & 0x03) + 1;
    const xSize = ((sizeShape >> 2) & 0x03) + 1;
    const tileIndex = tileLocByte & 0x07FF;
    const palette = (tileLocByte >> 11) & 0x1F;
    const sizeIndex = sizeShape & 0x0F;
    const tileCount = sizeTable[sizeIndex];
    
    console.log(`\nSprite ${spriteIndex}:`);
    console.log(`  Position: (${xOffset}, ${yOffset})`);
    console.log(`  Size: ${xSize}x${ySize} tiles`);
    console.log(`  Tile Index: ${tileIndex} (using ${tileCount} tiles)`);
    console.log(`  Palette: ${palette}`);
    
    // Move to next sprite
    spriteDataOffset += 8;
  }
}

// Run the simulation
simulateAddframe2(frameNumber);

console.log('\nFrame analysis complete');
