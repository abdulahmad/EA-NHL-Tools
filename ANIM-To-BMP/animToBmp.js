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
    currentIndex = currentIndex + 2 + 2;
    var numSpritesinFrame = animData.readInt16BE(currentIndex)+1;
    currentIndex = currentIndex + 2;
    
    // SprStratt	=	2+8	;equates for building frame lists from alice files SprStratt length = 2
    // SprStrhot	=	SprStratt+2 SprStrhot length = 24
    // SprStrnum	=	SprStrhot+24 SprStrnum length = 2
    // SprStrdat	=	SprStrnum+2 SprStrdat length = 8
    // add	#SprStrdat+8,d1
    console.log("Frame #",currentFrame,"frameHeader",frameHeader,"u",u1,u2,u3,"sprStrAtt",sprStrAtt,"sprStrHot",sprStrHot,"sprStrXHot",sprStrXHot,"sprStrYHot",sprStrYHot,"numSpritesinFrame",numSpritesinFrame);
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

const animFile = process.argv[2];
// const pal = process.argv[3];
convertToBMP(animFile);