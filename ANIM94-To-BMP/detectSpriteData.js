const fs = require('fs');

// Size table for validation
const sizetabTable = [1, 2, 3, 4, 2, 4, 6, 8, 3, 6, 9, 12, 4, 8, 12, 16];

// Detect sprite data in ROM
function detectSpriteData(romFile) {
  console.log('Detecting sprite data in:', romFile);
  const romData = fs.readFileSync(romFile);
  const romSize = romData.length;
  console.log(`ROM size: ${romSize} bytes (0x${romSize.toString(16)})`);

  const detectedSets = [];

  // Step 1: Scan for Frame Sprite Data Offsets tables
  for (let offset = 0; offset < romSize - 4; offset += 2) { // Align to 2-byte boundaries
    const potentialSet = detectFrameOffsets(romData, offset, romSize);
    if (potentialSet) {
      detectedSets.push(potentialSet);
    }
  }

  // Output results
  const output = {
    romFile,
    romSize,
    detectedSets,
  };
  fs.mkdirSync('Detected', { recursive: true });
  fs.writeFileSync(`Detected/${romFile.split('/').pop()}_sprite_data.json`, JSON.stringify(output, null, 2));
  console.log(`Detected ${detectedSets.length} sprite data sets. Results written to Detected/${romFile.split('/').pop()}_sprite_data.json`);
}

// Detect Frame Sprite Data Offsets table at given offset
function detectFrameOffsets(romData, startOffset, romSize) {
  // Heuristic: Table must be at least 100 frames and a multiple of 4 bytes
  const minFrames = 100;
  const maxFrames = 1000;
  let numFrames = 0;
  let currentOffset = startOffset;

  // Read potential table entries
  const frames = [];
  while (currentOffset + 4 <= romSize) {
    const numSprites = romData.readUInt16BE(currentOffset) + 1;
    const spriteOffset = romData.readUInt16BE(currentOffset + 2);

    // Validate entry
    if (numSprites > 255 || spriteOffset >= romSize) {
      break; // Unreasonable sprite count or invalid offset
    }

    frames.push({ numSprites, spriteOffset });
    numFrames++;
    currentOffset += 4;

    // Stop if table is too short or too long
    if (numFrames >= minFrames && (currentOffset >= romSize || romData.readUInt16BE(currentOffset) > 255)) {
      break;
    }
    if (numFrames > maxFrames) {
      break;
    }
  }

  if (numFrames < minFrames) {
    return null; // Table too short
  }

  // Validate sprite data
  let spriteDataStart = romSize;
  let spriteDataEnd = 0;
  for (const frame of frames) {
    const spriteAddr = frame.spriteOffset; // Relative offset, needs base address
    if (spriteAddr < romSize) {
      spriteDataStart = Math.min(spriteDataStart, spriteAddr);
      spriteDataEnd = Math.max(spriteDataEnd, spriteAddr + frame.numSprites * 8);
    }
  }

  // Adjust sprite data start to the earliest valid address
  let spriteDataBase = spriteDataStart;
  for (const frame of frames) {
    const absAddr = frame.spriteOffset + spriteDataBase;
    if (absAddr + frame.numSprites * 8 > romSize) {
      return null; // Invalid sprite data address
    }
    // Validate sprite data
    if (!validateSpriteData(romData, absAddr, frame.numSprites)) {
      return null;
    }
  }

  // Detect sprite tiles (search backward from spriteDataStart)
  const tileSection = detectSpriteTiles(romData, 0, spriteDataStart, romSize);
  if (!tileSection) {
    return null; // No valid tile section found
  }

  // Detect hotlist table (search after spriteDataEnd, same length as frame table)
  const hotlistSection = detectHotlistTable(romData, spriteDataEnd, romSize, numFrames * 4);
  const paletteSection = detectPaletteData(romData, spriteDataEnd, romSize); // Speculative

  return {
    frameOffsets: {
      start: startOffset,
      end: startOffset + numFrames * 4,
      numFrames,
    },
    spriteData: {
      start: spriteDataBase,
      end: spriteDataEnd,
    },
    spriteTiles: tileSection,
    hotlistTable: hotlistSection,
    paletteData: paletteSection,
  };
}

// Validate sprite data at given address
function validateSpriteData(romData, startAddr, numSprites) {
  let offset = startAddr;
  for (let i = 0; i < numSprites; i++) {
    if (offset + 8 > romData.length) {
      return false;
    }
    const ypos = romData.readInt16BE(offset);
    const xpos = romData.readInt16BE(offset + 2);
    const tileLoc = romData.readUInt16BE(offset + 4);
    const sizeIndex = romData.readUInt8(offset + 7);

    // Validate ranges
    if (Math.abs(ypos) > 512 || Math.abs(xpos) > 512) {
      return false; // Unreasonable coordinates
    }
    if (sizeIndex > 15) {
      return false; // Invalid size index
    }
    if ((tileLoc & 0x07FF) >= romData.length / 32) {
      return false; // Tile index out of range
    }
    if ((tileLoc >> 13) & 0x3 > 3) {
      return false; // Invalid palette index
    }

    offset += 8;
  }
  return true;
}

// Detect sprite tiles section
function detectSpriteTiles(romData, start, end, romSize) {
  // Look for a large block divisible by 32 bytes
  const minTiles = 1000; // Minimum number of tiles
  for (let offset = start; offset <= end - 32 * minTiles; offset += 32) {
    let tileCount = 0;
    let current = offset;
    while (current + 32 <= end && isValidTile(romData, current)) {
      tileCount++;
      current += 32;
    }
    if (tileCount >= minTiles) {
      return {
        start: offset,
        end: offset + tileCount * 32,
        numTiles: tileCount,
      };
    }
  }
  return null;
}

// Check if data at offset is a valid tile
function isValidTile(romData, offset) {
  for (let i = 0; i < 32; i++) {
    const byte = romData[offset + i];
    if ((byte >> 4) > 15 || (byte & 0x0F) > 15) {
      return false; // Invalid palette index
    }
  }
  return true;
}

// Detect hotlist table
function detectHotlistTable(romData, start, romSize, expectedLength) {
  for (let offset = start; offset <= romSize - expectedLength; offset += 2) {
    if (offset + expectedLength <= romSize) {
      // Assume hotlist is non-zero data of expected length
      let valid = true;
      for (let i = 0; i < expectedLength; i += 4) {
        const value = romData.readUInt32BE(offset + i);
        if (value === 0) {
          valid = false; // Too many zeros suggest padding
          break;
        }
      }
      if (valid) {
        return {
          start: offset,
          end: offset + expectedLength,
        };
      }
    }
  }
  return null;
}

// Detect palette data (speculative)
function detectPaletteData(romData, start, romSize) {
  const paletteSize = 128; // 4 palettes × 16 colors × 2 bytes
  for (let offset = start; offset <= romSize - paletteSize; offset += 2) {
    let valid = true;
    for (let i = 0; i < paletteSize; i += 2) {
      const color = romData.readUInt16BE(offset + i);
      // Check Sega Genesis color format (0000BBB0GGG0RRR0)
      if ((color & 0xF000) !== 0 || (color & 0x0111) !== 0) {
        valid = false;
        break;
      }
    }
    if (valid) {
      return {
        start: offset,
        end: offset + paletteSize,
        numPalettes: 4,
      };
    }
  }
  return null;
}

// Main execution
const romFile = process.argv[2];
if (!romFile) {
  console.error('Usage: node detectSpriteData.js <romfile>');
  process.exit(1);
}
detectSpriteData(romFile);