const fs = require('fs');

// Function to convert the compressed image to BMP format
const convertToBMP = (fileName) => {
  console.log('animToBMP:', fileName);

  console.log("Converting "+fileName+ " to BMP");
  // Read the compressed image data from the file
  const animData = fs.readFileSync(fileName);
  // Extract the header information from the compressed image
  // const fileType = animData.readInt8(0);
  const fileType = animData.toString('ascii', 0, 2);
  // const width = animData.readInt16LE(4);
  const numFrames = animData.readInt16BE(2)+1;
  // const bmpWidth = Math.ceil(width/4)*4; // round up width to nearest multiple of 4 for bmp pixel data format
  const numPals = animData.readInt16BE(4)+1;
  // const height = animData.readInt16LE(6);
  // const xOffset = animData.readInt16LE(8);
  // const yOffset = animData.readInt16LE(10);
  // const xPos = animData.readInt16LE(12);

  // const yPos = animData.readInt16LE(14);
  console.log("fileType",fileType,"numFrames",numFrames,"numPalettes",numPals);
    // Store the header information in a JSON file
  const headerInfo = { fileType, numFrames, numPals};
  fs.writeFileSync(`${fileName}.json`, JSON.stringify(headerInfo));
  var currentIndex = 6;
  for (var currentFrame=0; currentFrame<2; currentFrame++) {
    var frameHeader = animData.toString('ascii', currentIndex, currentIndex+2);
    currentIndex = currentIndex + 2;
    var u1 = animData.readInt16BE(currentIndex);
    currentIndex = currentIndex + 2;
    var u2 = animData.readInt16BE(currentIndex);
    currentIndex = currentIndex + 2;
    var u3 = animData.readInt16BE(currentIndex);
    currentIndex = currentIndex + 2;
    var sprStrAtt = animData.readInt16BE(currentIndex);
    currentIndex = currentIndex + 2;
    var sprStrHot = animData.readInt16BE(currentIndex);
    currentIndex = currentIndex + 2;
    var sprStrXHot = animData.readInt16BE(currentIndex);
    currentIndex = currentIndex + 2;
    var sprStrYHot = animData.readInt16BE(currentIndex);
    currentIndex = currentIndex + 2;
    var u4 = animData.readInt16BE(currentIndex);
    currentIndex = currentIndex + 2;
    var u5 = animData.readInt16BE(currentIndex);
    currentIndex = currentIndex + 2;
    var u6 = animData.readInt16BE(currentIndex);
    currentIndex = currentIndex + 2;
    var u7 = animData.readInt16BE(currentIndex);
    currentIndex = currentIndex + 2;
    var frXoff = animData.readInt16BE(currentIndex);
    currentIndex = currentIndex + 2;
    var frYoff = animData.readInt16BE(currentIndex);
    currentIndex = currentIndex + 2;
    var u10 = animData.readInt16BE(currentIndex);
    currentIndex = currentIndex + 2;
    var u11 = animData.readInt16BE(currentIndex);
    currentIndex = currentIndex + 2;
    var u12 = animData.readInt16BE(currentIndex);
    currentIndex = currentIndex + 2;
    var u13 = animData.readInt16BE(currentIndex);
    currentIndex = currentIndex + 2;
    var numSpritesinFrame = animData.readInt16BE(currentIndex)+1;
    currentIndex = currentIndex + 2;
    console.log("Frame #",currentFrame,"frameHeader",frameHeader,"u",u1,u2,u3,"sprStrAtt",sprStrAtt,"sprStrHot",sprStrHot,"sprStrXHot",sprStrXHot,"sprStrYHot",sprStrYHot,"u",u4,u5,u6,u7,"frXoff",frXoff,"frYoff",frYoff,u10,u11,u12,u13,"numSpritesinFrame",numSpritesinFrame);
    for (var currentSprite=0; currentSprite<numSpritesinFrame; currentSprite++) {
      // console.log('current file index at start of sprite:',currentIndex);

      var ypos = animData.readInt16BE(currentIndex);
      currentIndex = currentIndex + 2;
      var sizetab = animData.readInt16BE(currentIndex);
      currentIndex = currentIndex + 2;
      var tileLoc = animData.readInt16BE(currentIndex);
      currentIndex = currentIndex + 2;
      var xpos = animData.readInt16BE(currentIndex);
      currentIndex = currentIndex + 2;

      const result = parseSpriteData(sizetab, tileLoc);
      // console.log('current file index at end of sprite:',currentIndex);

      console.log("Sprite #", currentSprite,"ypos",ypos,"sizetab",sizetab,"tileLoc",tileLoc,"xpos",xpos);
      console.log(result);
    }
  }
  currentIndex = 35108; // Sprite.anim start of tile data
  var tileHeader = animData.toString('ascii', currentIndex, currentIndex+2);
  currentIndex = currentIndex + 2;
  var numTiles = animData.readInt16BE(currentIndex);
  currentIndex = currentIndex + 2;
  console.log("Tile Data Header", tileHeader, "numTiles", numTiles);

  // 32 bytes per tile; 5646 tiles = 180672 bytes
  // 35108 + 180672 = 215780 = 0x34AE4 <-- start of palette data

  // // Create a Buffer to store the BMP image data
  // const spitHeaderLength = 16;
  // const bmpHeaderLength = 40;
  // const bmpPadding = 14;
  // const fullBmpHeaderLength = bmpHeaderLength + bmpPadding; // Header + padding
  // const palLength = 256 * 4;
  // const unevenImagePadding = (bmpWidth - width) * height;
  // const bmpEOFLength = 2;
  // const pixelDataLength = width*height;
  // const expectedBmpLength = fullBmpHeaderLength + palLength + pixelDataLength + unevenImagePadding + bmpEOFLength; // height for line end bytes
  // const expectedRawLength = pixelDataLength;
  // // console.log("expected BMP length",expectedBmpLength,"expected raw length", expectedRawLength);
  // const bmpImage = Buffer.alloc(expectedBmpLength);
  // const rawImage = Buffer.alloc(expectedRawLength);
  
  // // Write the BMP header to the buffer
  // bmpImage.write('BM'); // BMP Identifier
  // bmpImage.writeUInt32LE(expectedBmpLength, 2); // File Size
  // bmpImage.writeUInt32LE(fullBmpHeaderLength+palLength, 10); // Byte Offset to Start of Image
  // bmpImage.writeUInt32LE(bmpHeaderLength, 14); // Size of Header
  // bmpImage.writeInt32LE(width, 18); // Image Width
  // bmpImage.writeInt32LE(height*-1, 22); // Image Height -- origin of pixel data is top left instead of bottom left
  // bmpImage.writeUInt16LE(1, 26); // Bit Planes
  // bmpImage.writeUInt16LE(8, 28); // Bits/Pixel -- 8 is grayscale
  // bmpImage.writeUInt32LE(pixelDataLength+unevenImagePadding+bmpEOFLength, 34); // Size of Compressed file

  // // Write the palette information to the buffer
  // if (typeof palFileName !== 'undefined') {
  //   const palFile = fs.readFileSync(palFileName);
  //   let palFileOffset = 0
  //   let palMultiplier = 1;
  //   if(palFileName.indexOf('.act') == -1) { // EA palette, skip header & multiply colour values by 4
  //     palFileOffset = 16;
  //     palMultiplier = 4;
  //   }
  //   for (let i = 0; i < 256; i++) {
  //     try {
  //       bmpImage.writeUInt8(palFile.readUint8(palFileOffset + 2 + i * 3)*palMultiplier, fullBmpHeaderLength + i * 4);     // R
  //       bmpImage.writeUInt8(palFile.readUint8(palFileOffset + 1 + i * 3)*palMultiplier, fullBmpHeaderLength + 1 + i * 4); // G
  //       bmpImage.writeUInt8(palFile.readUint8(palFileOffset + 0 + i * 3)*palMultiplier, fullBmpHeaderLength + 2 + i * 4); // B
  //       bmpImage.writeUInt8(0, fullBmpHeaderLength + 3 + i * 4); // A
  //     } catch(e) {
  //       if (e instanceof RangeError) {
  //         console.log("early end of palette file, will skip the rest of the palette");
  //         i = 256;
  //       } else {
  //         throw e;
  //       }
  //     }
  //   }
  // } else { // no palette, make it greyscale
  //   for (let i = 0; i < 256; i++) {
  //     bmpImage.writeUInt8(i, fullBmpHeaderLength + i * 4);     // R
  //     bmpImage.writeUInt8(i, fullBmpHeaderLength + 1 + i * 4); // G
  //     bmpImage.writeUInt8(i, fullBmpHeaderLength + 2 + i * 4); // B
  //     bmpImage.writeUInt8(0, fullBmpHeaderLength + 3 + i * 4); // A
  //   }
  // }

  // // Decode the compressed image data and write it to the buffer
  // let index = spitHeaderLength;
  // let bufferIndex = fullBmpHeaderLength+palLength;
  // let rawIndex = 0;
  // let rowCounter = 0;
  // while (rawIndex < expectedRawLength) {
  //   // console.log("index",index,compressedImage.byteOffset.toString(16).toUpperCase());
  //   let description;
  //   if (fileType == 123) { // override
  //     description = 1;
  //   } else {
  //     description = compressedImage.readUInt8(index++);
  //   }
    
  //   // console.log("description byte",description);
  //   if (description === 0) break;

  //   // let color = compressedImage.readUInt8(index++);
  //   if (description >= 128) {
  //       let writeLen = 255 - description + 1;
  //     // console.log("Write next X chars", writeLen.toString(16).toUpperCase());
  //     for (let i = 0; i < (writeLen); i++) {
  //       let color = compressedImage.readUInt8(index++);
  //       // console.log(color.toString(16).toUpperCase());
  //       bmpImage.writeUInt8(color, bufferIndex++);
  //       rowCounter++;
  //       if (rowCounter==width && unevenImagePadding !== 0) { 
  //         for(j=0; j < bmpWidth-width; j++) {
  //           bmpImage.writeUInt8('00', bufferIndex++); 
  //         }
  //         rowCounter = 0;
  //       }
  //       rawImage.writeUInt8(color, rawIndex++);
  //       // color = compressedImage.readUInt8(index++);
  //     }
  //   } else {
  //     // console.log("Write color X times","multiplier",description);
  //     for (let i = 0; i < description; i++) {
  //       let color = compressedImage.readUInt8(index);
  //       // console.log(color.toString(16).toUpperCase());
  //       bmpImage.writeUInt8(color, bufferIndex++);
  //       rowCounter++;
  //       if (rowCounter==width && unevenImagePadding !== 0) { 
  //         for(j=0; j < bmpWidth-width; j++) {
  //           bmpImage.writeUInt8('00', bufferIndex++); 
  //         }
  //         rowCounter = 0;
  //       }
  //       rawImage.writeUInt8(color, rawIndex++);
  //     }
  //     index++;
  //   }
  // }

  // // Write the BMP image data to a file
  // // bmpImage.writeUInt8('00', bufferIndex++);
  // // bmpImage.writeUInt8('00', bufferIndex++);
  // fs.writeFileSync(`${fileName}.bmp`, bmpImage);
  // // Write the RAW image data to a file
  // fs.writeFileSync(`${fileName}.raw`, rawImage);

  // // console.log(rawImage);

  // if (bmpImage.length !== expectedBmpLength) {
  //   console.log('ERROR BMP');
  //   throw new Error('Expected BMP Length',expectedBmpLength,'does not match actual length',bmpImage.length);
  // }
  // if (rawImage.length !== expectedRawLength) {
  //   console.log('ERROR RAW');
  //   throw new Error('Expected RAW Length',expectedRawLength,'does not match actual length',rawImage.length);
  // }
};

// sizetab table from assembly: maps size index (0–15) to number of 8x8 tiles
const sizetabTable = [1, 2, 3, 4, 2, 4, 6, 8, 3, 6, 9, 12, 4, 8, 12, 16];

// Dimensions table: maps size index to { width, height } in tiles
const dimensionsTable = [
  { width: 1, height: 1 }, // 1 tile
  { width: 1, height: 2 }, // 2 tiles
  { width: 1, height: 3 }, // 3 tiles
  { width: 2, height: 2 }, // 4 tiles
  { width: 2, height: 1 }, // 2 tiles
  { width: 2, height: 2 }, // 4 tiles
  { width: 2, height: 3 }, // 6 tiles
  { width: 2, height: 4 }, // 8 tiles
  { width: 1, height: 3 }, // 3 tiles
  { width: 2, height: 3 }, // 6 tiles
  { width: 3, height: 3 }, // 9 tiles
  { width: 3, height: 4 }, // 12 tiles
  { width: 2, height: 2 }, // 4 tiles
  { width: 2, height: 4 }, // 8 tiles
  { width: 3, height: 4 }, // 12 tiles
  { width: 4, height: 4 }  // 16 tiles
];

// Function to parse sizetab and tileLoc fields
function parseSpriteData(sizetab, tileLoc) {
  // Extract size index (low nibble, bits 0–3)
  const sizeIndex = (sizetab >> 8) & 0xF;

  // Ensure inputs are 16-bit unsigned integers
  sizetab = sizetab & 0xFFFF;
  tileLoc = tileLoc & 0xFFFF;

  // Get number of tiles from sizetab table
  const tileCount = sizetabTable[sizeIndex];

  // Get dimensions from dimensions table
  const dimensions = dimensionsTable[sizeIndex];

  // Extract tile index high bit (bit 15 of sizetab)
   // Extract tile index high bits (mimic assembly: sizetab & 0xF000, lsr #1)
   const tileIndexHigh = (sizetab & 0xF000) >> 1; // Bits 12–15 shifted to 11–14

  // Extract tile index low bits (bits 0–10 of tileLoc)
  const tileIndexLow = tileLoc & 0x07FF;

  // Combine to form 15-bit tile index
  const tileIndex = tileIndexHigh | tileIndexLow;

  // Extract potential flip/priority flags (bits 12–13 of sizetab)
  const flipPriorityFlags = (sizetab & 0x3000) >> 12;
  const hFlip = (flipPriorityFlags & 0x2) !== 0; // Bit 13 (tentative, based on assembly)
  const vFlip = (flipPriorityFlags & 0x1) !== 0; // Bit 12 (tentative, based on assembly)
  // Note: These are speculative; the assembly uses object attributes for flips, so these may be priority or unused

  // Extract middle bits (4–11) of sizetab, possibly unused
  const middleBits = (sizetab & 0x0FF0) >> 4;

  // Return all extracted data
  return {
    sizeIndex,          // Index into sizetab table (0–15)
    tileCount,          // Number of 8x8 tiles (1–16)
    dimensions,         // { width, height } in tiles
    tileIndex,          // 15-bit tile index for tile data section
    hFlip,              // Horizontal flip flag (speculative)
    vFlip,              // Vertical flip flag (speculative)
    flipPriorityFlags,  // Raw bits 12–13 for debugging
    middleBits          // Bits 4–11, possibly unused
  };
}

// Example usage
// Assume sizetab and tileLoc are read from bytes 2–3 and 4–5 (big-endian)
// Example: sizetab = 0x4001, tileLoc = 0x0020
// const sizetab = 0x4001; // Example: size index = 1, high tile bit = 0
// const tileLoc = 0x0020; // Example: tile index low = 32

// const result = parseSpriteData(sizetab, tileLoc);
// console.log(result);
// Output:
// {
//   sizeIndex: 1,          // Size index 1
//   tileCount: 2,          // 2 tiles (from sizetabTable[1])
//   tileIndex: 32,         // Tile index = 0x0020 (high bit 0, low bits 32)
//   hFlip: true,           // Bit 13 set (speculative)
//   vFlip: false,          // Bit 12 not set
//   flipPriorityFlags: 2,  // Bits 13–12 = 0b10
//   middleBits: 0          // Bits 4–11 = 0
// }

// // Helper function to read 16-bit big-endian word from buffer (if needed)
// function readUInt16BE(buffer, offset) {
//   return (buffer[offset] << 8) | buffer[offset + 1];
// }

// // Example with a buffer (if reading from a file)
// const buffer = Buffer.from([
//   0x00, 0x10, // ypos = 16
//   0x40, 0x01, // sizetab = 0x4001
//   0x00, 0x20, // tileLoc = 0x0020
//   0x00, 0x30  // xpos = 48
// ]);
// const spriteSizetab = readUInt16BE(buffer, 2);
// const spriteTileLoc = readUInt16BE(buffer, 4);
// console.log(parseSpriteData(spriteSizetab, spriteTileLoc));

const animFile = process.argv[2];
// const pal = process.argv[3];
convertToBMP(animFile);