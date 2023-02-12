const fs = require('fs');

// Function to convert the compressed image to BMP format
const convertToBMP = (fileName) => {
  console.log("Converting "+fileName+ " to BMP");
  // Read the compressed image data from the file
  const compressedImage = fs.readFileSync(fileName);
  // Extract the header information from the compressed image
  const width = compressedImage.readInt16LE(4);
  const bmpWidth = Math.ceil(width/4)*4; // round up width to nearest multiple of 4 for bmp pixel data format
  const height = compressedImage.readInt16LE(6);
  const xOffset = compressedImage.readInt16LE(8);
  const yOffset = compressedImage.readInt16LE(10);
  const xPos = compressedImage.readInt16LE(12);
  const yPos = compressedImage.readInt16LE(14);
  console.log("width",width,"height",height,"xOffset",xOffset,"yOffset",yOffset,"xPos",xPos,"yPos",yPos);
    // Store the header information in a JSON file
  const headerInfo = { width, height, xOffset, yOffset, xPos, yPos };
  fs.writeFileSync(`${fileName}.json`, JSON.stringify(headerInfo));

  // Create a Buffer to store the BMP image data
  const spitHeaderLength = 16;
  const bmpHeaderLength = 40;
  const bmpPadding = 14;
  const fullBmpHeaderLength = bmpHeaderLength + bmpPadding; // Header + padding
  const palLength = 256 * 4;
  const unevenImagePadding = (bmpWidth - width) * height;
  const bmpEOFLength = 2;
  const pixelDataLength = width*height;
  const expectedBmpLength = fullBmpHeaderLength + palLength + pixelDataLength + unevenImagePadding + bmpEOFLength; // height for line end bytes
  const expectedRawLength = pixelDataLength;
  const bmpImage = Buffer.alloc(expectedBmpLength);
  const rawImage = Buffer.alloc(pixelDataLength);
  
  // Write the BMP header to the buffer
  bmpImage.write('BM'); // BMP Identifier
  bmpImage.writeUInt32LE(expectedBmpLength, 2); // File Size
  bmpImage.writeUInt32LE(fullBmpHeaderLength+palLength, 10); // Byte Offset to Start of Image
  bmpImage.writeUInt32LE(bmpHeaderLength, 14); // Size of Header
  bmpImage.writeInt32LE(width, 18); // Image Width
  bmpImage.writeInt32LE(height*-1, 22); // Image Height -- origin of pixel data is top left instead of bottom left
  bmpImage.writeUInt16LE(1, 26); // Bit Planes
  bmpImage.writeUInt16LE(8, 28); // Bits/Pixel -- 8 is grayscale
  bmpImage.writeUInt32LE(pixelDataLength+unevenImagePadding+bmpEOFLength, 34); // Size of Compressed file

  // Write the palette information to the buffer
  for (let i = 0; i < 256; i++) {
    bmpImage.writeUInt8(i, fullBmpHeaderLength + i * 4);     // R
    bmpImage.writeUInt8(i, fullBmpHeaderLength + 1 + i * 4); // G
    bmpImage.writeUInt8(i, fullBmpHeaderLength + 2 + i * 4); // B
    bmpImage.writeUInt8(0, fullBmpHeaderLength + 3 + i * 4); // A
  }

  // Decode the compressed image data and write it to the buffer
  let index = spitHeaderLength;
  let bufferIndex = fullBmpHeaderLength+palLength;
  let rawIndex = 0;
  let rowCounter = 0;
  while (index < compressedImage.length) {
    // console.log("index",index,compressedImage.byteOffset.toString(16).toUpperCase());
    let description = compressedImage.readUInt8(index++);
    // console.log("description byte",description);
    if (description === 0) break;

    // let color = compressedImage.readUInt8(index++);
    if (description >= 128) {
        let writeLen = 255 - description + 1;
      // console.log("Write next X chars", writeLen.toString(16).toUpperCase());
      for (let i = 0; i < (writeLen); i++) {
        let color = compressedImage.readUInt8(index++);
        // console.log(color.toString(16).toUpperCase());
        bmpImage.writeUInt8(color, bufferIndex++);
        rowCounter++;
        if (rowCounter==width && unevenImagePadding !== 0) { 
          for(j=0; j < bmpWidth-width; j++) {
            bmpImage.writeUInt8('00', bufferIndex++); 
          }
          rowCounter = 0;
        }
        rawImage.writeUInt8(color, rawIndex++);
        // color = compressedImage.readUInt8(index++);
      }
    } else {
      // console.log("Write color X times","multiplier",description);
      for (let i = 0; i < description; i++) {
        let color = compressedImage.readUInt8(index);
        // console.log(color.toString(16).toUpperCase());
        bmpImage.writeUInt8(color, bufferIndex++);
        rowCounter++;
        if (rowCounter==width && unevenImagePadding !== 0) { 
          for(j=0; j < bmpWidth-width; j++) {
            bmpImage.writeUInt8('00', bufferIndex++); 
          }
          rowCounter = 0;
        }
        rawImage.writeUInt8(color, rawIndex++);
      }
      index++;
    }
  }

  // Write the BMP image data to a file
  // bmpImage.writeUInt8('00', bufferIndex++);
  // bmpImage.writeUInt8('00', bufferIndex++);
  fs.writeFileSync(`${fileName}.bmp`, bmpImage);
  // Write the RAW image data to a file
  fs.writeFileSync(`${fileName}.raw`, rawImage);

  // console.log(rawImage);

  if (bmpImage.length !== expectedBmpLength) {
    console.log('ERROR BMP');
    throw new Error('Expected BMP Length',expectedBmpLength,'does not match actual length',bmpImage.length);
  }
  if (rawImage.length !== expectedRawLength) {
    console.log('ERROR RAW');
    throw new Error('Expected RAW Length',expectedRawLength,'does not match actual length',rawImage.length);
  }
};

const spriteName = process.argv[2];
convertToBMP(spriteName);

/* 876photoshop
42 4D       BMP ID
38 08 00 00 FILE SIZE - 2104 BYTES -- MATCH WITH WIN EXPLORER
00 00 00 00 RESERVED
36 04 00 00 BYTE OFFSET to start of image - 1078 -- not match
28 00       SIZE OF HEADER - 40 match
00 00 1F 00 WIDTH - 31 - MATCH
00 00 E0 FF HEIGHT - -32 - MATCH
FF FF       PLANES - MATCH
01 00       BITS PER PIXEL - MATCH
08 00 00 00 COMPRESSION TYPE - MATCH
00 00 02 04 SIZE OF COMPRESSED FILE - 1026
00 00 12 0B HORIZONTAL RES - 2834
00 00 12 0B VERTICAL RES - 2834
00 00 00 00 00 00 00 00 00 00 -- 10 BYTES PADDING?
PAL offset 0x36
PAL = 0x400 = 1024
*/

/* 876 broken
42 4D       BMP ID
16 08 00 00 FILE SIZE - 2070 BYTES -- MATCH WITH WIN EXPLORER
00 00 00 00 RESERVED
36 00 00 00 BYTE OFFSET to start of image - 54 -- not match
28 00       SIZE OF HEADER - 40 match
00 00 1F 00 WIDTH - 31 - MATCH
00 00 E0 FF HEIGHT - -32 MATCH
FF FF       PLANES - MATCH
01 00       BPP - MATCH
08 00 00 00 COMPRESSION TYPE - MATCH
00 00 E0 07 SIZE OF COMPRESSED FILE - 2016
00 00 00 00 HORIZONTAL RES - 0 NOT MATCH
00 00 00 00 VERTICAL RES - 0 NOT MATCH
00 00 00 00 00 00 00 00 00 00 00 -- 11 BYTES PADDING?
PAL offset 0x36
PAL = 0x400 = 1024

header = 54 bytes
pallength = 1024
pixels = 31*32 = 992
end of line 00
*/