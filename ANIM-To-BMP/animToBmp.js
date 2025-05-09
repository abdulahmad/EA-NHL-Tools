const fs = require('fs');

// Function to convert the compressed image to BMP format
const convertToBMP = (fileName, palFile) => {
  console.log('animToBMP:', fileName);
  fs.mkdirSync('Extracted', { recursive: true });
  fs.mkdirSync(`Extracted\\${fileName}`, { recursive: true });

  console.log("Converting "+fileName+ " to BMP");
  const animData = fs.readFileSync(fileName);
  const fileType = animData.toString('ascii', 0, 2);
  const numFrames = animData.readInt16BE(2)+1;
  const numPals = animData.readInt16BE(4)+1;
  console.log("fileType",fileType,"numFrames",numFrames,"numPalettes",numPals);

  // Initialize frames array
  const frames = new Array(numFrames); // Pre-allocate for efficiency

  // Store the header information in a JSON file
  const headerInfo = { fileType, numFrames, numPals};
  fs.writeFileSync(`Extracted\\${fileName}\\${fileName}.json`, JSON.stringify(headerInfo));

  var currentIndex = 6;
  for (var currentFrame=0; currentFrame<numFrames; currentFrame++) {
    console.log('currentIndex',currentIndex);
    // Initialize frame object
    const frame = {
      frameIndex: currentFrame,
      sprites: []
    };

    // Read frame header and attributes
    frame.frameHeader = animData.toString('ascii', currentIndex, currentIndex + 2);
    currentIndex += 2;
    frame.u1 = animData.readInt16BE(currentIndex); currentIndex += 2; // 02-03
    frame.u2 = animData.readInt16BE(currentIndex); currentIndex += 2; // 04-05
    frame.doubleCanvasWidth = animData.readInt16BE(currentIndex); currentIndex += 2; // 06-07
    frame.sprStrAtt = animData.readInt16BE(currentIndex); currentIndex += 2; //08-09
    frame.sprStrHot = animData.readInt16BE(currentIndex); currentIndex += 2; //10
    frame.sprStrXHot = animData.readInt16BE(currentIndex); currentIndex += 2;//12
    frame.sprStrYHot = animData.readInt16BE(currentIndex); currentIndex += 2;//14
    frame.u4 = animData.readInt16BE(currentIndex); currentIndex += 2;//16
    frame.u5 = animData.readInt16BE(currentIndex); currentIndex += 2;//18
    frame.u6 = animData.readInt16BE(currentIndex); currentIndex += 2;//20
    frame.u7 = animData.readInt16BE(currentIndex); currentIndex += 2;//22
    frame.frXoff = animData.readInt16BE(currentIndex); currentIndex += 2;//24
    frame.frYoff = animData.readInt16BE(currentIndex); currentIndex += 2;//26
    frame.u10 = animData.readInt16BE(currentIndex); currentIndex += 2;//28
    frame.u11 = animData.readInt16BE(currentIndex); currentIndex += 2;//30
    frame.u12 = animData.readInt16BE(currentIndex); currentIndex += 2;//32
    frame.u13 = animData.readInt16BE(currentIndex); currentIndex += 2;//34
    frame.numSpritesinFrame = animData.readInt16BE(currentIndex) + 1; currentIndex += 2;//36

    console.log("Frame #",currentFrame,frame);
    for (var currentSprite=0; currentSprite<frame.numSpritesinFrame; currentSprite++) {
      const sprite = {
        spriteIndex: currentSprite,
        ypos: animData.readInt16BE(currentIndex),
        sizetabByte: animData.readInt16BE(currentIndex + 2),
        tileLocByte: animData.readInt16BE(currentIndex + 4),
        xpos: animData.readInt16BE(currentIndex + 6)
      };
      currentIndex += 8;

      // Get parsed data and merge into sprite object
      const parsedData = parseSpriteData(sprite.sizetabByte, sprite.tileLocByte);
      Object.assign(sprite, parsedData); // Merge parsed key/value pairs into sprite

      frame.sprites.push(sprite);
      console.log(sprite);
      if (sprite.priority == 1) { throw new Exception('priority bit used'); }
    }
    frames[currentFrame] = frame;
  }
  
  // currentIndex = 35108; // Sprite.anim start of tile data
  var tileHeader = animData.toString('ascii', currentIndex, currentIndex+2);
  currentIndex = currentIndex + 2;
  var numTiles = animData.readInt16BE(currentIndex);
  currentIndex = currentIndex + 2;
  console.log("Tile Data Header", tileHeader, "numTiles", numTiles);
  const spriteTilesIndex = currentIndex;
  
 // Skip to palette data
  currentIndex = currentIndex + numTiles * 32;
  var palHeader = animData.toString('ascii', currentIndex, currentIndex + 2);
  currentIndex = currentIndex + 2;
  console.log('palette header', palHeader);

  // Array to store individual palettes and combined palette
  const palettes = [];
  const combinedPalette = Buffer.alloc(64 * 3); // 64 colors (16 per palette * 4 palettes), 3 bytes each (R,G,B)

  // Read palette file if provided
  let overridePalette = null;
  if (palFile) {
    const palData = fs.readFileSync(palFile);
    if (palData.length !== 32) {
      throw new Error(`Palette file ${palFile} must contain exactly 32 bytes (16 colors). Found ${palData.length} bytes.`);
    }
    overridePalette = Buffer.alloc(16 * 3); // 16 colors, 3 bytes each (R,G,B)
    for (let i = 0; i < 16; i++) {
      const color = palData.readUInt16BE(i * 2); // Read big-endian 16-bit value
      const blue = (color >> 9) & 0x07;  // Bits 9–11
      const green = (color >> 5) & 0x07; // Bits 5–7
      const red = (color >> 1) & 0x07;   // Bits 1–3
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

  for (var palIndex = 0; palIndex < 4; palIndex++) {
    var animPal = Buffer.alloc(16 * 3); // 16 colors, 3 bytes (R,G,B) each
    if (palIndex === 2 && overridePalette) {
      // Use the override palette for palette 2
      overridePalette.copy(animPal, 0, 0, 16 * 3);
      console.log(`Palette ${palIndex} overridden with palette file:`, animPal);
    } else {
      // Read from animData
      for (var colorIndex = 0; colorIndex < 16; colorIndex++) {
        // Read 2 bytes for each color (9-bit palette stored in 16 bits)
        const color = animData.readUInt16BE(currentIndex);
        currentIndex += 2;

        // Extract 3-bit components (Sega Genesis palette format: 0000BBB0GGG0RRR0)
        const blue = (color >> 9) & 0x07;  // Bits 9–11
        const green = (color >> 5) & 0x07; // Bits 5–7
        const red = (color >> 1) & 0x07;   // Bits 1–3

        // Scale 3-bit values (0–7) to 8-bit (0–255) by multiplying by 32
        const scaledRed = red * 32;
        const scaledGreen = green * 32;
        const scaledBlue = blue * 32;

        // Write RGB values to animPal buffer
        const offset = colorIndex * 3;
        animPal.writeUInt8(scaledRed, offset);
        animPal.writeUInt8(scaledGreen, offset + 1);
        animPal.writeUInt8(scaledBlue, offset + 2);
      }
      console.log(`Palette ${palIndex} read from animData:`, animPal);
    }

    // Write to combined palette (colors 0-15 for pal 0, 16-31 for pal 1, etc.)
    const combinedOffset = palIndex * 16 * 3;
    animPal.copy(combinedPalette, combinedOffset, 0, 16 * 3);

    palettes.push(animPal); // Store the individual palette

    // Write palette to .ACT file
    const actBuffer = Buffer.alloc(768); // 256 colors (768 bytes), no footer
    animPal.copy(actBuffer, 0, 0, 16 * 3); // Copy 16 RGB triplets
    fs.writeFileSync(`Extracted\\${fileName}\\pal${palIndex}.act`, actBuffer);
  }

   // Skip palette 2 data in animData if overridden
   if (overridePalette) {
    currentIndex += 32; // 16 colors * 2 bytes
  }

  // Write combined palette to .ACT file
  const combinedActBuffer = Buffer.alloc(768); // 256 colors (768 bytes), no footer
  combinedPalette.copy(combinedActBuffer, 0, 0, 64 * 3); // Copy 64 RGB triplets
  fs.writeFileSync(`Extracted\\${fileName}\\palCombined.act`, combinedActBuffer);
  
  for (var currentFrame=0; currentFrame<numFrames; currentFrame++) { // populate tile data & save image
    var minX; var maxX;
    var minY; var maxY;
    var length;
    var width;
     console.log('AA TEST',currentFrame,frames[currentFrame]);
    for (var currentSprite=0; currentSprite<frames[currentFrame].sprites.length; currentSprite++) {
      console.log('AA2','frame',currentFrame,'sprite',currentSprite, frames[currentFrame].sprites[currentSprite].dimensions);
      var curMinX = frames[currentFrame].sprites[currentSprite].xpos;
      var curMaxX = (frames[currentFrame].sprites[currentSprite].dimensions.width * 8) + curMinX;
      var curMinY = frames[currentFrame].sprites[currentSprite].ypos;
      var curMaxY = (frames[currentFrame].sprites[currentSprite].dimensions.height * 8) + curMinY;

      if (minX == null || curMinX < minX) {
        minX = curMinX
      }
      if (maxX == null || curMaxX > maxX) {
        maxX = curMaxX
      }
      if (minY == null || curMinY < minY) {
        minY = curMinY
      }
      if (maxY == null || curMaxY > maxY) {
        maxY = curMaxY
      }
      console.log(curMinX, curMaxX, curMinY, curMaxY);
    }
    console.log('original canvas dimensions',minX,maxX,minY,maxY);
    var frameDimensions = adjustCanvasDimensions(minX,maxX,minY,maxY);
    console.log('adjusted canvas',frameDimensions);

    var spriteCanvas = Array(frameDimensions.maxY).fill().map(() => Array(frameDimensions.maxX).fill(0));
    console.log('Rows:', spriteCanvas.length, 'Columns:', spriteCanvas[0].length);
    // print2DArray(spriteCanvas);

    for (var currentSpriteIndex=0; currentSpriteIndex<frames[currentFrame].sprites.length; currentSpriteIndex++) { // lay pixels into canvas
      var sprite = frames[currentFrame].sprites[currentSpriteIndex];
      
      var spriteOffset = spriteTilesIndex + sprite.tileIndex * 32;
      var idx = spriteOffset;
      console.log('Place Sprite',currentSpriteIndex,'tileIndex',sprite.tileIndex,'at',sprite.xpos+frameDimensions.offsetX,sprite.ypos+frameDimensions.offsetY,'size',sprite.dimensions,'fileOffset',spriteOffset);
      
      for (var curSpriteCol=0; curSpriteCol<sprite.dimensions.width; curSpriteCol++) {
        for (var curSpriteRow=0; curSpriteRow<sprite.dimensions.height; curSpriteRow++) {
          console.log('currentTile',curSpriteCol+curSpriteRow+1,'of',sprite.dimensions.width*sprite.dimensions.height);
          for (var curTileRow=0; curTileRow<8; curTileRow++) { // Y
            for (var curTileCol=0; curTileCol<4; curTileCol++) { // 
              // Calculate base pixel coordinates within the sprite (unflipped)
              var pixelXInSprite = (curSpriteCol * 8) + (curTileCol * 2);
              var pixelYInSprite = (curSpriteRow * 8) + curTileRow;

              // Apply flipping across the entire sprite
              var flippedX = sprite.hFlip == true ? (sprite.dimensions.width * 8 - pixelXInSprite - 2) : pixelXInSprite;
              var flippedY = sprite.vFlip == true ? (sprite.dimensions.height * 8 - pixelYInSprite - 1) : pixelYInSprite;

              // Calculate final canvas coordinates
              var ypixel = sprite.ypos + frameDimensions.offsetY + flippedY;
              var xpixel = sprite.xpos + frameDimensions.offsetX + flippedX;

              // Read the byte at the current index
              const byte = animData[idx];

              // Upper 4 bits: Shift right by 4 to get the high nibble
              const upper = (byte >> 4) & 0x0F;
              // Lower 4 bits: Mask with 0x0F to get the low nibble
              const lower = byte & 0x0F;
              // Offset Palette so that the right palette colors are used -- required because frames can be multi-palette
              const palShift = (16*sprite.paletteIndex);

              // console.log('idx', idx, 'yxpixels', ypixel, xpixel, 'byte', byte, 'upper/lower', upper, lower);
              // console.log(`${idx} = spriteOffset ${spriteOffset} + curTileRow*4 ${curTileRow*4} + curTileCol ${curTileCol} + curSpriteRow*16 ${curSpriteRow*16} + (curSpriteCol*sprite.dimensions.height*16) ${curSpriteCol*sprite.dimensions.height*16}`);
              
              // Assign pixels to canvas, swapping upper/lower for hFlip
              if (sprite.hFlip) { // if != 0 statements ensures transparency works
                if (lower != 0) { spriteCanvas[ypixel][xpixel] = lower+palShift; } // Swap upper and lower nibbles
                if (upper != 0) { spriteCanvas[ypixel][xpixel + 1] = upper+palShift; }
              } else {
                if (upper != 0) { spriteCanvas[ypixel][xpixel] = upper+palShift; }
                if (lower != 0) { spriteCanvas[ypixel][xpixel + 1] = lower+palShift; }
              }

              idx++;
            }
          }
          if(currentFrame==80) { 
            print2DArray(spriteCanvas);
          }
        }
      }
    }

    minX = null;
    maxX = null;
    minY = null;
    maxY = null;

    saveImage(spriteCanvas,frameDimensions.maxX,frameDimensions.maxY,fileName,currentFrame,combinedPalette);
    fs.writeFileSync(`Extracted\\${fileName}\\${currentFrame}.json`, JSON.stringify(frames[currentFrame]));
  }

  function adjustCanvasDimensions(minX, maxX, minY, maxY) {
    const width = maxX - minX;
    const height = maxY - minY;
    const offsetX = -minX; // Amount to shift X coordinates
    const offsetY = -minY; // Amount to shift Y coordinates
    
    return {
        minX: 0,
        minY: 0,
        maxX: width,
        maxY: height,
        offsetX: offsetX,
        offsetY: offsetY
    };
  }
  // 32 bytes per tile; 5646 tiles = 180672 bytes
  // 35108 + 180672 = 215780 = 0x34AE4 <-- start of palette data
};

// sizetab table from assembly: maps size index (0–15) to number of 8x8 tiles
const sizetabTable = [1, 2, 3, 4, 2, 4, 6, 8, 3, 6, 9, 12, 4, 8, 12, 16];

// Dimensions table: maps size index to { width, height } in tiles
const dimensionsTable = [
  { width: 1, height: 1 }, // 1 tile
  { width: 1, height: 2 }, // 2 tiles
  { width: 1, height: 3 }, // 3 tiles
  { width: 1, height: 4 }, // 4 tiles
  { width: 2, height: 1 }, // 2 tiles
  { width: 2, height: 2 }, // 4 tiles
  { width: 2, height: 3 }, // 6 tiles
  { width: 2, height: 4 }, // 8 tiles
  { width: 3, height: 1 }, // 3 tiles
  { width: 3, height: 2 }, // 6 tiles
  { width: 3, height: 3 }, // 9 tiles
  { width: 3, height: 4 }, // 12 tiles
  { width: 4, height: 1 }, // 4 tiles
  { width: 4, height: 2 }, // 8 tiles
  { width: 4, height: 3 }, // 12 tiles
  { width: 4, height: 4 }  // 16 tiles
];

// Function to parse sizetab and tileLoc fields
function parseSpriteData(sizetabByte, tileLocByte) {
  // Extract size index (low nibble, bits 0–3)
  const sizeIndex = (sizetabByte >> 8) & 0xF;

  // Ensure inputs are 16-bit unsigned integers
  sizetab = sizetabByte & 0xFFFF;
  tileLoc = tileLocByte & 0xFFFF;

  // Get number of tiles from sizetab table
  const tileCount = sizetabTable[sizeIndex];

  // Get dimensions from dimensions table
  const dimensions = dimensionsTable[sizeIndex];

  // Extract tile index high bit (bit 15 of sizetab)
   // Extract tile index high bits (mimic assembly: sizetab & 0xF000, lsr #1)
   const tileIndexHigh = (sizetab & 0xF000) >> 1; // Bits 12–15 shifted to 11–14

  // Extract tile index low bits (bits 0–10 of tileLoc)
  const tileIndexLow = tileLocByte & 0x07FF;

  // Combine to form 15-bit tile index
  const tileIndex = tileIndexHigh | tileIndexLow;

  // Extract potential flip/priority flags (bits 11,12,15 of tileLoc)
  const priority = (tileLocByte >> 15) & 1;
  const vFlip = (tileLocByte >> 12) & 1;
  const hFlip = (tileLocByte >> 11) & 1;

  // Extract palette from bits 13–14 of tileLoc
  const paletteIndex = (tileLocByte >> 13) & 0x3; // Bits 13–14, masked to get 2-bit value (0–3)

  // Extract middle bits (4–11) of sizetab, possibly unused
  const middleBits = (sizetabByte & 0x0FF0) >> 4;

  // Return all extracted data
  return {
    sizeIndex,          // Index into sizetab table (0–15)
    tileCount,          // Number of 8x8 tiles (1–16)
    dimensions,         // { width, height } in tiles
    tileIndex,          // 15-bit tile index for tile data section
    hFlip,              // Horizontal flip flag (speculative)
    vFlip,              // Vertical flip flag (speculative)
    paletteIndex,            // Palette of Sprite
    priority,           // 1 = high, 0 = low
    middleBits          // Bits 4–11, possibly unused
  };
}

const animFile = process.argv[2];
const palFile = process.argv[3]; // Optional palette file to override palette 2
convertToBMP(animFile, palFile);

function print2DArray(array2D) {
  // Find the longest number for padding
  const maxLength = Math.max(...array2D.flat().map(num => String(num).length));
  
  // Print each row with aligned columns
  array2D.forEach(row => {
    console.log(row.map(num => String(num).padStart(maxLength, ' ')).join(' | '));
  });
}

function saveImage(spriteArray, width, height, fileName, currentFrame, combinedPalette) {
  // Create a Buffer to store the BMP image data
  const bmpWidth = Math.ceil(width / 4) * 4; // Round up width to nearest multiple of 4 for BMP pixel data format
  const bmpHeaderLength = 40;
  const bmpPadding = 14;
  const fullBmpHeaderLength = bmpHeaderLength + bmpPadding; // Header + padding
  const palLength = 256 * 4; // 256 colors, 4 bytes each (RGBA)
  const unevenImagePadding = (bmpWidth - width) * height;
  const bmpEOFLength = 2;
  const pixelDataLength = width * height;
  const expectedBmpLength = fullBmpHeaderLength + palLength + pixelDataLength + unevenImagePadding + bmpEOFLength;
  const expectedRawLength = pixelDataLength;
  console.log("expected BMP length", expectedBmpLength, "expected raw length", expectedRawLength);
  const bmpImage = Buffer.alloc(expectedBmpLength);
  const rawImage = Buffer.alloc(expectedRawLength);

  // Write the BMP header to the buffer
  bmpImage.write('BM'); // BMP Identifier
  bmpImage.writeUInt32LE(expectedBmpLength, 2); // File Size
  bmpImage.writeUInt32LE(fullBmpHeaderLength + palLength, 10); // Byte Offset to Start of Image
  bmpImage.writeUInt32LE(bmpHeaderLength, 14); // Size of Header
  bmpImage.writeInt32LE(width, 18); // Image Width
  bmpImage.writeInt32LE(height * -1, 22); // Image Height (negative for top-down)
  bmpImage.writeUInt16LE(1, 26); // Bit Planes
  bmpImage.writeUInt16LE(8, 28); // Bits/Pixel (8-bit indexed)
  bmpImage.writeUInt32LE(pixelDataLength + unevenImagePadding + bmpEOFLength, 34); // Size of pixel data

  // Write the combined palette to the BMP
  for (let i = 0; i < 64; i++) {
    const offset = i * 3;
    // BMP palette is in BGRA order
    bmpImage.writeUInt8(combinedPalette[offset + 2], fullBmpHeaderLength + i * 4); // B
    bmpImage.writeUInt8(combinedPalette[offset + 1], fullBmpHeaderLength + i * 4 + 1); // G
    bmpImage.writeUInt8(combinedPalette[offset], fullBmpHeaderLength + i * 4 + 2); // R
    bmpImage.writeUInt8(0, fullBmpHeaderLength + i * 4 + 3); // A (unused)
  }
  // Fill remaining palette entries (64–255) with black
  for (let i = 64; i < 256; i++) {
    bmpImage.writeUInt8(0, fullBmpHeaderLength + i * 4); // B
    bmpImage.writeUInt8(0, fullBmpHeaderLength + i * 4 + 1); // G
    bmpImage.writeUInt8(0, fullBmpHeaderLength + i * 4 + 2); // R
    bmpImage.writeUInt8(0, fullBmpHeaderLength + i * 4 + 3); // A
  }

  // Write pixel data
  let bufferIndex = fullBmpHeaderLength + palLength;
  let rawIndex = 0;
  let rowCounter = 0;

  for (var yidx = 0; yidx < height; yidx++) {
    for (var xidx = 0; xidx < width; xidx++) {
      let color = spriteArray[yidx][xidx];
      bmpImage.writeUInt8(color, bufferIndex++);
      rowCounter++;
      if (rowCounter == width && unevenImagePadding !== 0) {
        for (let j = 0; j < bmpWidth - width; j++) {
          bmpImage.writeUInt8(0, bufferIndex++); // Padding bytes
        }
        rowCounter = 0;
      }
      rawImage.writeUInt8(color, rawIndex++);
    }
  }

  // Write the BMP image data to a file
  fs.writeFileSync(`Extracted\\${fileName}\\${currentFrame}.bmp`, bmpImage);
  // Write the RAW image data to a file
  fs.writeFileSync(`Extracted\\${fileName}\\${currentFrame}.raw`, rawImage);

  if (bmpImage.length !== expectedBmpLength) {
    console.log('ERROR BMP');
    throw new Error(`Expected BMP Length ${expectedBmpLength} does not match actual length ${bmpImage.length}`);
  }
  if (rawImage.length !== expectedRawLength) {
    console.log('ERROR RAW');
    throw new Error(`Expected RAW Length ${expectedRawLength} does not match actual length ${rawImage.length}`);
  }
}