const fs = require('fs');
const crc32 = require('crc-32'); // Install via `npm install crc-32`

// ROM configuration
const ROM_CONFIG = {
  NHLPA93: {
    name: 'NHLPA93 (v1.1)',
    crc32: 0xf361d0bf,
    expectedSize: 0x80000, // 512 kb
    addresses: {
      //spaList: { start:0x4D8E, end: 0x6446, length: 0xA }, // 5816 bytes -> should be 5810 or 5820
      spaList: { start:0x4D8E, end: 0x6440, length: 0xA },
      frameOffsets: { start: 0x6FAF2, end: 0x70006 }, // 0x514 bytes
      spriteData: { start: 0x70006, end: 0x743FC },
      hotlist: { start: 0x743FC, end: 0x74910 },
      spriteTiles: { start: 0x3A3B0, end: 0x6FAF0 },
      paletteOffset: { start: 0x35E50 } // 0x4560 before spriteTiles
    },
  },
  NHL94: {
    name: 'NHL94',
    crc32: 0x9438f5dd,
    expectedSize: 0x100000, // 1 MB (adjust if 2 MB)
    addresses: {
      //spaList: { start:0x5B1C, end: 0x76B2 },
      spaList: { start:0x5B1C, end: 0x76B0, length: 0xA },
      frameOffsets: { start: 0x9E726, end: 0x9EDC2 }, // 0x69E bytes
      spriteData: { start: 0x9EDC2, end: 0xA44C8 },
      hotlist: { start: 0xA44C8, end: 0xA4B54 },
      spriteTiles: { start: 0x5DE84, end: 0x9E724 },
      paletteOffset: { start: 0x59924 }, // same as 93,  0x4560 before spriteTiles
      paletteOffset2: { start: 0x4E298 },
      paletteOffset3: { start: 0xA5A1E },
      paletteOffset4: { start: 0xA98CC },
      paletteOffset5: { start: 0xB8A0A }, // same as 93
      paletteOffset6: { start: 0xBBE78 },
      paletteOffset7: { start: 0xBDAE6 },
      paletteOffset8: { start: 0xBEE34 },
      paletteOffset9: { start: 0xBF0E2 },
      paletteOffset10: { start: 0xBF66C },
      paletteOffset11: { start: 0xEA6D6 },
      paletteOffset12: { start: 0xEAF9A },
      paletteOffset13: { start: 0xEBE60 },
      paletteOffset14: { start: 0xEC7EE },
      paletteOffset15: { start: 0xED7FA } // same as 93
    },
  },
};
const frameOffsetHeaderLength = 2;
// Function to convert ROM sprite data to BMP format
const convertRomToBMP = (romFile, palFile) => {
  console.log('romSpriteToBMP:', romFile);
  fs.mkdirSync('Extracted', { recursive: true });

  // Read ROM and verify
  const romData = fs.readFileSync(romFile);
  const romSize = romData.length;
  const romCrc = crc32.buf(romData) >>> 0; // Convert to unsigned 32-bit

  // Detect ROM type
  let romConfig;
  if (romSize === ROM_CONFIG.NHLPA93.expectedSize && romCrc === ROM_CONFIG.NHLPA93.crc32) {
    romConfig = ROM_CONFIG.NHLPA93;
  } else if (romSize === ROM_CONFIG.NHL94.expectedSize && romCrc === ROM_CONFIG.NHL94.crc32) {
    romConfig = ROM_CONFIG.NHL94;
  } else {
    throw new Error(
      `Invalid ROM. Expected NHLPA93 (size: ${ROM_CONFIG.NHLPA93.expectedSize}, CRC32: ${ROM_CONFIG.NHLPA93.crc32.toString(16)}) ` +
      `or NHL94 (size: ${ROM_CONFIG.NHL94.expectedSize}, CRC32: ${ROM_CONFIG.NHL94.crc32.toString(16)}). ` +
      `Got size: ${romSize}, CRC32: ${romCrc.toString(16)}.`
    );
  }
  console.log(`Detected ROM: ${romConfig.name}`);

  fs.mkdirSync(`Extracted\\${romConfig.name}`, { recursive: true });

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
      frameIndex: currentFrame,
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
    let spriteIndex = frame.spriteDataOffset;
    console.log('sprite loop',currentFrame, frame.numSpritesInFrame);
    for (let currentSprite = 0; currentSprite < frame.numSpritesInFrame; currentSprite++) { // assuming there is a dummy frame at the end

      const sprite = {
          spriteIndex: currentSprite,
          xpos: romData.readInt16BE(spriteIndex), // Bytes 0–1: X position
          ypos: romData.readInt16BE(spriteIndex + 2), // Bytes 2–3: Y position
          tileLocByte: romData.readUInt16BE(spriteIndex + 4), // Bytes 4–5: Tile offset
          paletteByte: romData.readUInt8(spriteIndex + 6), // Byte 6: Palette-related
          sizetabByte: romData.readUInt8(spriteIndex + 7), // Byte 7: Size index
        };
      // Parse sprite data
      const parsedData = parseSpriteData(sprite.sizetabByte, sprite.tileLocByte, sprite.paletteByte);
      Object.assign(sprite, parsedData);
      
      // console.log(sprite);

      frame.sprites.push(sprite);
      spriteIndex += 8;

      // console.log(frame);
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

        // Scale 3-bit values (0–7) to 8-bit (0–255) by multiplying by 32
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
    fs.writeFileSync(`Extracted\\${romConfig.name}\\pal${palIndex}.act`, actBuffer);
  }

  // Write combined palette
  const combinedActBuffer = Buffer.alloc(768);
  combinedPalette.copy(combinedActBuffer, 0, 0, 64 * 3);
  fs.writeFileSync(`Extracted\\${romConfig.name}\\palCombined.act`, combinedActBuffer);

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
    }

    // Save frame data and image
    saveImage(spriteCanvas, frameDimensions.maxX, frameDimensions.maxY, romConfig.name, currentFrame, combinedPalette);
    fs.writeFileSync(`Extracted\\${romConfig.name}\\${currentFrame}.json`, JSON.stringify(frames[currentFrame]));
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
function parseSpriteData(sizetabByte, tileLocByte, paletteByte) {
  // Extract size index (low 4 bits of sizetabByte)
  const sizeIndex = sizetabByte & 0x0F;
  const tileCount = sizetabTable[sizeIndex];
  const dimensions = dimensionsTable[sizeIndex];

  // Tile index: combine high bits from sizetabByte (bits 4–7) and low bits from tileLocByte (bits 0–10)
  const tileIndexLow = tileLocByte & 0x07FF; // Bits 0–10
  const tileIndexHigh = (sizetabByte & 0xF0) << 7; // Bits 4–7 shifted to 11–14
  const tileIndex = tileIndexHigh | tileIndexLow;

  // Extract flags from tileLocByte
  const priority = (tileLocByte >> 15) & 1; // Bit 15
  const vFlip = (tileLocByte >> 12) & 1; // Bit 12
  const hFlip = (tileLocByte >> 11) & 1; // Bit 11

  // Extract palette index from paletteByte (bits 5–6)
  const paletteIndex = (paletteByte >> 5) & 0x3; // Bits 5–6, masked to 2-bit value (0–3)

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
  fs.writeFileSync(`Extracted\\${fileName}\\${currentFrame}.bmp`, bmpImage);
  fs.writeFileSync(`Extracted\\${fileName}\\${currentFrame}.raw`, rawImage);

  if (bmpImage.length !== expectedBmpLength || rawImage.length !== expectedRawLength) {
    throw new Error(`Length mismatch: BMP ${bmpImage.length}/${expectedBmpLength}, RAW ${rawImage.length}/${expectedRawLength}`);
  }
}

// Main execution
const romFile = process.argv[2];
const palFile = process.argv[3];
convertRomToBMP(romFile, palFile);