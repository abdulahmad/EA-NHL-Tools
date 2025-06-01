const fs = require('fs');
const path = require('path');
const crc32 = require('crc-32'); // Install via `npm install crc-32`

// ROM configuration
const ROM_CONFIG = {
  NHL95: {
    name: 'NHL95',
    crc32: 0xe8ee917e,
    expectedSize: 0x200000, // 1 MB (adjust if 2 MB)
    addresses: {
      spaList: { start:0x5B1C, end: 0x76B0, length: 0xA }, // incorrect
      paletteOffset: { start: 0x14BEFA }, // 0x206E before spriteTiles
      spriteTiles: { start: 0xCA574, end: 0x131874 }, // 0x3398 tiles or 13028 tiles.
      // tile size is 0x67300 or 422656 bytes
      frameOffsets: { start: 0x1318F4, end: 0x132136 }, // 0x842 bytes
      // first sprite offset 2114, last sprite offset = 25202, diff of 23088 or 0x5A30
      spriteData: { start: 0x132136, end: 0x137B66 },
      hotlist: { start: 0xA44C8, end: 0xA4B54 }, // incorrect
    },
  },
  NHL96: {
    name: 'NHL96',
    crc32: 0x8135702c,
    expectedSize: 0x200000, // 1 MB (adjust if 2 MB)
    addresses: {
      spaList: { start:0x5B1C, end: 0x76B0, length: 0xA }, // incorrect
      paletteOffset: { start: 0x172DF6 },
      spriteTiles: { start: 0x9AAA8, end: 0x12F588 },
      frameOffsets: { start: 0x12F608, end: 0x13012E }, // 0xB26 bytes
      // first sprite offset = 3718 , last sprite offset = 32750, diff of 29032 or 0x7168
      spriteData: { start: 0x13012E, end: 0x137296 },
      hotlist: { start: 0xA44C8, end: 0xA4B54 }, // incorrect
    },
  },
  NHL97: {
    name: 'NHL97',
    crc32: 0xf067c103,
    expectedSize: 0x200000, // 1 MB (adjust if 2 MB)
    addresses: {
      //spaList: { start:0x5B1C, end: 0x76B2 },
      spaList: { start:0x5B1C, end: 0x76B0, length: 0xA }, // incorrect
      paletteOffset: { start: 0x9AF24 },
      spriteTiles: { start: 0xAABB8, end: 0x160CD8 },
      frameOffsets: { start: 0x160D58, end: 0x161D2E }, // 0xB26 bytes B61AA + AABB8 = 160D62
      // 160D58 + 4054
      // 160D58 + b9de
      spriteData: { start: 0x161D2E, end: 0x16C736 },
      hotlist: { start: 0xA44C8, end: 0xA4B54 }, // incorrect
    },
  },
};

let minTileLocByte = Number.MAX_SAFE_INTEGER;
let maxTileLocByte = Number.MIN_SAFE_INTEGER;
let minTileIndex = Number.MAX_SAFE_INTEGER;
let maxTileIndex = Number.MIN_SAFE_INTEGER;
let minSpriteDataOffset = Number.MAX_SAFE_INTEGER;
let maxSpriteDataOffset = Number.MIN_SAFE_INTEGER;
let minSpriteOffset = Number.MAX_SAFE_INTEGER;
let maxSpriteOffset = Number.MIN_SAFE_INTEGER;

const frameOffsetHeaderLength = 2;
// Function to convert ROM sprite data to BMP format
const convertRomToBMP = (romFile, palFile) => {
  try {
    console.log('romSpriteToBMP:', romFile);
    fs.mkdirSync('Extracted', { recursive: true });

    // Check if file exists before attempting to read
    if (!fs.existsSync(romFile)) {
      throw new Error(`ROM file '${romFile}' not found.`);
    }

    // Read ROM and verify
    const romData = fs.readFileSync(romFile);
    const romSize = romData.length;
    const romCrc = crc32.buf(romData) >>> 0; // Convert to unsigned 32-bit

    // Detect ROM type
    let romConfig;
    if (romSize === ROM_CONFIG.NHL95.expectedSize && romCrc === ROM_CONFIG.NHL95.crc32) {
      romConfig = ROM_CONFIG.NHL95;
    } else if (romSize === ROM_CONFIG.NHL96.expectedSize && romCrc === ROM_CONFIG.NHL96.crc32) {
      romConfig = ROM_CONFIG.NHL96;
    } else if (romSize === ROM_CONFIG.NHL97.expectedSize && romCrc === ROM_CONFIG.NHL97.crc32) {
      romConfig = ROM_CONFIG.NHL97;
    } else {
      throw new Error(
        `Invalid ROM. Expected NHL95 (size: ${ROM_CONFIG.NHL95.expectedSize}, CRC32: ${ROM_CONFIG.NHL95.crc32.toString(16)}). ` +
        `or NHL96 (size: ${ROM_CONFIG.NHL96.expectedSize}, CRC32: ${ROM_CONFIG.NHL96.crc32.toString(16)}). ` +
        `or NHL97 (size: ${ROM_CONFIG.NHL97.expectedSize}, CRC32: ${ROM_CONFIG.NHL97.crc32.toString(16)}). ` +
        `Got size: ${romSize}, CRC32: ${romCrc.toString(16)}.`
      );
    }
    console.log(`Detected ROM: ${romConfig.name}`);

    fs.mkdirSync(path.join('Extracted', romConfig.name), { recursive: true });

    // Calculate number of frames
    const frameTableSize = romConfig.addresses.frameOffsets.end - romConfig.addresses.frameOffsets.start;
    // 4 bytes per frame (2 for numSprites, 2 for offset), last frame is dummy
    const numFrames = (frameTableSize / 2) - 1; 
    console.log(`Number of frames: ${numFrames}`);

    // Initialize frames array
    const frames = new Array(numFrames);

    // Read frame offsets and sprite counts
    currentIndex = romConfig.addresses.frameOffsets.start;
    for (let currentFrame = 0; currentFrame < numFrames; currentFrame++) {
      const frame = {
        frameIndex: currentFrame+1,
        sprites: [],
      };

      // Read frame data
      // frame.numSpritesinFrame = romData.readUInt16BE(currentIndex) + 1; // SprStrNum + 1
      frame.spriteDataOffset = romData.readUInt16BE(currentIndex) + romConfig.addresses.frameOffsets.start - frameOffsetHeaderLength;
      frame.nextOffset = romData.readUInt16BE(currentIndex+2) + romConfig.addresses.frameOffsets.start - frameOffsetHeaderLength;
      frame.numSpritesInFrame = (frame.nextOffset - frame.spriteDataOffset) / 8;
      currentIndex += 2;
      
      console.log(frame);

      // Read sprite data
             let spriteIndex = frame.spriteDataOffset+2;
             console.log('AATEST234', spriteIndex);
      if (frame.numSpritesInFrame > 25) { throw new Error(`Frame ${currentFrame + 1} has too many sprites: ${frame.numSpritesInFrame}. Maximum is 25.`); }
      for (let currentSprite = 0; currentSprite < frame.numSpritesInFrame; currentSprite++) {        const sprite = {
          spriteIndex: currentSprite,
          ypos: romData.readInt16BE(spriteIndex), // Bytes 0-1: Y position
          sizeFormat: romData.readUInt8(spriteIndex + 2), // Byte 2: Size/format
          attributeByte: romData.readUInt8(spriteIndex + 3), // Byte 3: Attribute data (flip, palette)
          tileLocByte: romData.readUInt16BE(spriteIndex + 4), // Bytes 4-5: Tile index + attributes
          xpos: romData.readInt16BE(spriteIndex + 6), // Bytes 6-7: X position
        };

        const parsedData = parseSpriteData(sprite.sizeFormat, sprite.tileLocByte, sprite.attributeByte);
        console.log(parsedData.dimensions);
        Object.assign(sprite, parsedData);

        minTileLocByte = Math.min(minTileLocByte, sprite.tileLocByte);
        maxTileLocByte = Math.max(maxTileLocByte, sprite.tileLocByte);
        minTileIndex = Math.min(minTileIndex, sprite.tileIndex);
        maxTileIndex = Math.max(maxTileIndex, sprite.tileIndex);
        minSpriteDataOffset = Math.min(minSpriteDataOffset, frame.spriteDataOffset);
        maxSpriteDataOffset = Math.max(maxSpriteDataOffset, frame.spriteDataOffset);

        frame.sprites.push(sprite);
        spriteIndex += 8;
      }
      console.log(frame);
      frames[currentFrame] = frame;
    }

    // Palette handling
    const combinedPalette = Buffer.alloc(64 * 3); // 64 colors (16 per palette * 4), 3 bytes each (RGB)
    let overridePalette = null;

    if (palFile) {
      const palData = fs.readFileSync(palFile);
      if (palData.length !== 32) {
        throw new Error(`Palette file ${palFile} must contain exactly 32 bytes (16 colors). Found ${palData.length} bytes.`);
      }
      overridePalette = Buffer.alloc(16 * 3);
      for (let i = 0; i < 16; i++) {
        const color = palData.readUInt16BE(i * 2);
        const blue = (color >> 9) & 0x07;
        const green = (color >> 5) & 0x07;
        const red = (color >> 1) & 0x07;
        const scaledRed = red * 32;
        const scaledGreen = green * 32;
        const scaledBlue = blue * 32;
        const offset = i * 3;
        overridePalette.writeUInt8(scaledRed, offset);
        overridePalette.writeUInt8(scaledGreen, offset + 1);
        overridePalette.writeUInt8(scaledBlue, offset + 2);
      }
      console.log(`Palette file ${palFile} read and parsed for palette 2 override.`);
    }

    // Default palettes (black if no palette file provided for non-overridden palettes)
    for (let palIndex = 0; palIndex < 4; palIndex++) {
      const animPal = Buffer.alloc(16 * 3);
      if (palIndex === 2 && overridePalette) {
        overridePalette.copy(animPal, 0, 0, 16 * 3);
      } else {
        // Fill with black (or read from ROM if palette offset is provided)
        for (let i = 0; i < 16; i++) {
          // animPal[i] = 0;
          let currentPalIndex = romConfig.addresses.paletteOffset.start + (i*2) + 16 * palIndex;
          // console.log('AA TEST',currentPalIndex);
          const color = romData.readUInt16BE(currentPalIndex);

          // Extract 3-bit components (Sega Genesis palette format: 0000BBB0GGG0RRR0)
          const blue = (color >> 9) & 0x07;  // Bits 9–11
          const green = (color >> 5) & 0x07; // Bits 5–7
          const red = (color >> 1) & 0x07;   // Bits 1–3

          // Scale 3-bit values (0–7) to 8-bit (0–255) by multiplying with 32
          const scaledRed = red * 32;
          const scaledGreen = green * 32;
          const scaledBlue = blue * 32;

          // Write RGB values to animPal buffer
          const offset = i * 3;
          animPal.writeUInt8(scaledRed, offset);
          animPal.writeUInt8(scaledGreen, offset + 1);
          animPal.writeUInt8(scaledBlue, offset + 2);
        }
      }
      const combinedOffset = palIndex * 16 * 3;
      animPal.copy(combinedPalette, combinedOffset, 0, 16 * 3);

      // Write palette to .ACT file
      const actBuffer = Buffer.alloc(768);
      animPal.copy(actBuffer, 0, 0, 16 * 3);
      fs.writeFileSync(path.join('Extracted', romConfig.name, `pal${palIndex}.act`), actBuffer);
    }

    // Write combined palette
    const combinedActBuffer = Buffer.alloc(768);
    combinedPalette.copy(combinedActBuffer, 0, 0, 64 * 3);
    fs.writeFileSync(path.join('Extracted', romConfig.name, 'palCombined.act'), combinedActBuffer);

    // Process frames and generate images
    for (let currentFrame = 0; currentFrame < numFrames; currentFrame++) {
      let minX, maxX, minY, maxY;

      // Calculate canvas dimensions
      for (let currentSprite = 0; currentSprite < frames[currentFrame].sprites.length; currentSprite++) {
        const sprite = frames[currentFrame].sprites[currentSprite];
        const curMinX = sprite.xpos;
        const curMaxX = curMinX + sprite.dimensions.width * 8;
        const curMinY = sprite.ypos;
        const curMaxY = curMinY + sprite.dimensions.height * 8;

        minX = minX == null || curMinX < minX ? curMinX : minX;
        maxX = maxX == null || curMaxX > maxX ? curMaxX : maxX;
        minY = minY == null || curMinY < minY ? curMinY : minY;
        maxY = maxY == null || curMaxY > maxY ? curMaxY : maxY;
      }

      const frameDimensions = adjustCanvasDimensions(minX || 0, maxX || 0, minY || 0, maxY || 0);
      const spriteCanvas = Array(frameDimensions.maxY).fill().map(() => Array(frameDimensions.maxX).fill(0));

      // Render sprites to canvas
      for (let currentSpriteIndex = 0; currentSpriteIndex < frames[currentFrame].sprites.length; currentSpriteIndex++) {
        const sprite = frames[currentFrame].sprites[currentSpriteIndex];
        const spriteOffset = romConfig.addresses.spriteTiles.start + sprite.tileIndex * 32;
        let idx = spriteOffset;

        minSpriteOffset = Math.min(minSpriteOffset, spriteOffset);
        maxSpriteOffset = Math.max(maxSpriteOffset, spriteOffset);

        for (let curSpriteCol = 0; curSpriteCol < sprite.dimensions.width; curSpriteCol++) {
          for (let curSpriteRow = 0; curSpriteRow < sprite.dimensions.height; curSpriteRow++) {
            for (let curTileRow = 0; curTileRow < 8; curTileRow++) {
              for (let curTileCol = 0; curTileCol < 4; curTileCol++) {
                const pixelXInSprite = curSpriteCol * 8 + curTileCol * 2;
                const pixelYInSprite = curSpriteRow * 8 + curTileRow;

                const flippedX = sprite.hFlip ? (sprite.dimensions.width * 8 - pixelXInSprite - 2) : pixelXInSprite;
                const flippedY = sprite.vFlip ? (sprite.dimensions.height * 8 - pixelYInSprite - 1) : pixelYInSprite;

                const ypixel = sprite.ypos + frameDimensions.offsetY + flippedY;
                const xpixel = sprite.xpos + frameDimensions.offsetX + flippedX;

                if (ypixel >= 0 && ypixel < frameDimensions.maxY && xpixel >= 0 && xpixel < frameDimensions.maxX) {
                  const byte = romData[idx];
                  const upper = (byte >> 4) & 0x0F;
                  const lower = byte & 0x0F;
                  const palShift = 16 * sprite.paletteIndex;

                  if (sprite.hFlip) {
                    if (lower !== 0) spriteCanvas[ypixel][xpixel] = lower + palShift;
                    if (upper !== 0 && xpixel + 1 < frameDimensions.maxX) spriteCanvas[ypixel][xpixel + 1] = upper + palShift;
                  } else {
                    if (upper !== 0) spriteCanvas[ypixel][xpixel] = upper + palShift;
                    if (lower !== 0 && xpixel + 1 < frameDimensions.maxX) spriteCanvas[ypixel][xpixel + 1] = lower + palShift;
                  }
                }
                idx++;
              }
            }
          }
        }
      }    // Save frame data and image
      saveImage(spriteCanvas, frameDimensions.maxX, frameDimensions.maxY, romConfig.name, currentFrame, combinedPalette);
      fs.writeFileSync(path.join('Extracted', romConfig.name, `${currentFrame+1}.json`), JSON.stringify(frames[currentFrame]));
    }

    // Log the min/max values
    console.log('====== Tile Statistics ======');
    console.log('Number of frames:', numFrames);
    console.log(`Min tileLocByte: 0x${minTileLocByte.toString(16).toUpperCase()} (${minTileLocByte})`);
    console.log(`Max tileLocByte: 0x${maxTileLocByte.toString(16).toUpperCase()} (${maxTileLocByte})`);
    console.log(`Min tileIndex: 0x${minTileIndex.toString(16).toUpperCase()} (${minTileIndex})`);
    console.log(`Max tileIndex: 0x${maxTileIndex.toString(16).toUpperCase()} (${maxTileIndex})`);
    console.log(`Min SpriteDataOffset: 0x${minSpriteDataOffset.toString(16).toUpperCase()} (${minSpriteDataOffset})`);
    console.log(`Max SpriteDataOffset: 0x${maxSpriteDataOffset.toString(16).toUpperCase()} (${maxSpriteDataOffset})`);
    console.log(`Min SpriteOffset: 0x${minSpriteOffset.toString(16).toUpperCase()} (${minSpriteOffset})`);
    console.log(`Max SpriteOffset: 0x${maxSpriteOffset.toString(16).toUpperCase()} (${maxSpriteOffset})`);
    console.log(`Tile range: 0x${(maxTileIndex - minTileIndex).toString(16).toUpperCase()} (${maxTileIndex - minTileIndex})`);
    console.log(`Sprite Data range: 0x${(maxSpriteDataOffset - minSpriteDataOffset).toString(16).toUpperCase()} (${maxSpriteDataOffset - minSpriteDataOffset})`);
    console.log(`Sprite Offset range: 0x${(maxSpriteOffset - minSpriteOffset).toString(16).toUpperCase()} (${maxSpriteOffset - minSpriteOffset})`);
    console.log('===========================');
  } catch (error) {
    // Don't log here, let the calling function handle the error
    throw error; // Re-throw to be caught by the main try-catch
  }
};

// sizetab table
const sizetabTable = [1, 2, 3, 4, 2, 4, 6, 8, 3, 6, 9, 12, 4, 8, 12, 16];

// Dimensions table
const dimensionsTable = [
  { width: 1, height: 1 }, { width: 1, height: 2 }, { width: 1, height: 3 }, { width: 1, height: 4 },
  { width: 2, height: 1 }, { width: 2, height: 2 }, { width: 2, height: 3 }, { width: 2, height: 4 },
  { width: 3, height: 1 }, { width: 3, height: 2 }, { width: 3, height: 3 }, { width: 3, height: 4 },
  { width: 4, height: 1 }, { width: 4, height: 2 }, { width: 4, height: 3 }, { width: 4, height: 4 },
];

// Parse sprite data
function parseSpriteData(sizeFormat, tileLocByte, attributeByte) {
  // Extract size information from sizeFormat byte (byte 2)
  // Extract bits 4-7 from sizeFormat into sizeIndex
  const sizeIndex = sizeFormat & 0x0F;

  const tileCount = sizetabTable[sizeIndex];
  const dimensions = dimensionsTable[sizeIndex];
  let tileIndexHigh = (sizeFormat >> 4) & 0x0F; 

  // Extract bits from tileLocByte
  const tileIndexLow = tileLocByte & 0x07FF; // Bits 0-10, mask with 0x07FF (0000011111111111)
  const hFlip = (tileLocByte >> 11) & 0x01; // Bit 11, shift right 11 bits, mask with 0x01 (00000001)
  const vFlip = (tileLocByte >> 12) & 0x01; // Bit 12, shift right 12 bits, mask with 0x01 (00000001)
  const paletteIndex = (tileLocByte >> 13) & 0x03; // Bits 13-14, shift right 13 bits, mask with 0x03 (00000011)
  const priority = (tileLocByte >> 15) & 0x01; // Bit 15, shift right 15 bits, mask with 0x01 (00000001)
  console.log('AA TEST!!!!', tileIndexHigh, tileIndexLow);
  // Combine tileIndexLow (bits 0-10) and tileIndexHigh (bits 0-2 into bits 11-13) into tileIndex
  const tileIndex = (tileIndexLow & 0x07FF) | ((tileIndexHigh) << 11);

  return {
    sizeIndex,
    tileCount,
    dimensions,
    tileIndex,
    hFlip,
    vFlip,
    paletteIndex,
    priority,
  };
}

// Adjust canvas dimensions
function adjustCanvasDimensions(minX, maxX, minY, maxY) {
  const width = maxX - minX;
  const height = maxY - minY;
  const offsetX = -minX;
  const offsetY = -minY;

  return {
    minX: 0, minY: 0, maxX: width, maxY: height, offsetX, offsetY,
  };
}

// Save image (BMP and RAW)
function saveImage(spriteArray, width, height, fileName, currentFrame, combinedPalette) {
  const bmpWidth = Math.ceil(width / 4) * 4;
  const bmpHeaderLength = 40;
  const bmpPadding = 14;
  const fullBmpHeaderLength = bmpHeaderLength + bmpPadding;
  const palLength = 256 * 4;
  const unevenImagePadding = (bmpWidth - width) * height;
  const bmpEOFLength = 2;
  const pixelDataLength = width * height;
  const expectedBmpLength = fullBmpHeaderLength + palLength + pixelDataLength + unevenImagePadding + bmpEOFLength;
  const expectedRawLength = pixelDataLength;

  const bmpImage = Buffer.alloc(expectedBmpLength);
  const rawImage = Buffer.alloc(expectedRawLength);

  // BMP header
  bmpImage.write('BM');
  bmpImage.writeUInt32LE(expectedBmpLength, 2);
  bmpImage.writeUInt32LE(fullBmpHeaderLength + palLength, 10);
  bmpImage.writeUInt32LE(bmpHeaderLength, 14);
  bmpImage.writeInt32LE(width, 18);
  bmpImage.writeInt32LE(height * -1, 22);
  bmpImage.writeUInt16LE(1, 26);
  bmpImage.writeUInt16LE(8, 28);
  bmpImage.writeUInt32LE(pixelDataLength + unevenImagePadding + bmpEOFLength, 34);

  // Palette
  for (let i = 0; i < 64; i++) {
    const offset = i * 3;
    bmpImage.writeUInt8(combinedPalette[offset + 2], fullBmpHeaderLength + i * 4); // B
    bmpImage.writeUInt8(combinedPalette[offset + 1], fullBmpHeaderLength + i * 4 + 1); // G
    bmpImage.writeUInt8(combinedPalette[offset], fullBmpHeaderLength + i * 4 + 2); // R
    bmpImage.writeUInt8(0, fullBmpHeaderLength + i * 4 + 3); // A
  }
  for (let i = 64; i < 256; i++) {
    bmpImage.writeUInt8(0, fullBmpHeaderLength + i * 4);
    bmpImage.writeUInt8(0, fullBmpHeaderLength + i * 4 + 1);
    bmpImage.writeUInt8(0, fullBmpHeaderLength + i * 4 + 2);
    bmpImage.writeUInt8(0, fullBmpHeaderLength + i * 4 + 3);
  }

  // Pixel data
  let bufferIndex = fullBmpHeaderLength + palLength;
  let rawIndex = 0;
  let rowCounter = 0;

  for (let yidx = 0; yidx < height; yidx++) {
    for (let xidx = 0; xidx < width; xidx++) {
      const color = spriteArray[yidx][xidx];
      bmpImage.writeUInt8(color, bufferIndex++);
      rowCounter++;
      if (rowCounter === width && unevenImagePadding !== 0) {
        for (let j = 0; j < bmpWidth - width; j++) {
          bmpImage.writeUInt8(0, bufferIndex++);
        }
        rowCounter = 0;
      }
      rawImage.writeUInt8(color, rawIndex++);
    }
  }

  // Write files  
  fs.writeFileSync(path.join('Extracted', fileName, `${currentFrame+1}.bmp`), bmpImage);
  fs.writeFileSync(path.join('Extracted', fileName, `${currentFrame+1}.raw`), rawImage);

  if (bmpImage.length !== expectedBmpLength || rawImage.length !== expectedRawLength) {
    throw new Error(`Length mismatch: BMP ${bmpImage.length}/${expectedBmpLength}, RAW ${rawImage.length}/${expectedRawLength}`);
  }
}

// Function to display usage information
function displayUsage() {
  console.log('EA NHL 93/94 ROM Sprite Extractor');
  console.log('=================================');
  console.log('\nExtracts sprite animations from NHL 93 and NHL 94 ROM files and converts them to BMP images');
  console.log('\nUsage: node anim94ToBmp.js <romFile> [palettePath]');
  console.log('\nParameters:');
  console.log('  romFile     - Path to the ROM file (NHL 93 or NHL 94)');
  console.log('  palettePath - Optional path to a palette file (16-color, 32 bytes) to override palette 2');
  console.log('\nExamples:');
  console.log('  node anim94ToBmp.js nhl94retail.bin');
  console.log('  node anim94ToBmp.js nhl93retail.bin custom_palette.bin');
  console.log('\nSupported ROMs:');
  console.log('  - NHLPA 93 (v1.1): CRC32 0xf361d0bf, Size: 512KB');
  console.log('  - NHL 94: CRC32 0x9438f5dd, Size: 1MB');
  console.log('\nOutput:');
  console.log('  The script creates an "Extracted/<ROM Name>" directory with:');
  console.log('   - BMP images for each frame');
  console.log('   - RAW data files');
  console.log('   - JSON files with frame data');
  console.log('   - ACT palette files');
  console.log('\nNote: This tool is cross-platform compatible (Windows, macOS, Linux)');
}

// Main execution
const romFile = process.argv[2];
const palFile = process.argv[3];

// Check if arguments were provided
if (!romFile) {
  displayUsage();
  process.exit(1);
}

try {
  convertRomToBMP(romFile, palFile);
} catch (error) {
  console.error(`Error processing ROM file: ${error.message}`);
  process.exit(1);
}