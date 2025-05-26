const fs = require('fs');

// Function to convert the compressed image to BMP format
const convertToBMP = (fileName, palFileName) => {
  console.log('convertToBMP:', fileName, palFileName);

  console.log("Converting "+fileName+ " to BMP");
  // Read the compressed image data from the file
  const compressedImage = fs.readFileSync(fileName);
  // Extract the header information from the compressed image
  const fileType = compressedImage.readInt8(0);
  const width = compressedImage.readInt16LE(4);
  const bmpWidth = Math.ceil(width/4)*4; // round up width to nearest multiple of 4 for bmp pixel data format
  const height = compressedImage.readInt16LE(6);
  const xOffset = compressedImage.readInt16LE(8);
  const yOffset = compressedImage.readInt16LE(10);
  const xPos = compressedImage.readInt16LE(12);
  const yPos = compressedImage.readInt16LE(14);
  console.log("fileType",fileType,"width",width,"height",height,"xOffset",xOffset,"yOffset",yOffset,"xPos",xPos,"yPos",yPos);
    // Store the header information in a JSON file
  const headerInfo = { fileType, width, height, xOffset, yOffset, xPos, yPos };
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
  // console.log("expected BMP length",expectedBmpLength,"expected raw length", expectedRawLength);
  const bmpImage = Buffer.alloc(expectedBmpLength);
  const rawImage = Buffer.alloc(expectedRawLength);
  
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
  if (palFileName && fs.existsSync(palFileName)) {
    console.log(`Using palette file: ${palFileName}`);
    try {
      const palFile = fs.readFileSync(palFileName);
      let palFileOffset = 0;
      let palMultiplier = 1;
      let isEAPalette = false;
      
      // Determine palette type based on file extension and content
      if (palFileName.toLowerCase().indexOf('.act') === -1) {
        // Likely an EA palette file
        isEAPalette = true;
        palFileOffset = 16; // Skip 16-byte header in EA palette files
        palMultiplier = 4;  // EA palettes use 0-63 color values, multiply by 4 to get 0-255
        console.log('Detected EA palette format');
      } else {
        console.log('Detected ACT palette format');
      }
      
      // Debug info about palette file
      console.log(`Palette file size: ${palFile.length} bytes`);
      if (palFile.length < 768 && !isEAPalette) {
        console.log('Warning: ACT palette file appears to be smaller than expected (should be 768 bytes)');
      }
      
      // Apply palette
      for (let i = 0; i < 256; i++) {
        try {
          // Note: RGB components might be in BGR order in some palette formats
          const rPos = palFileOffset + 0 + i * 3; // Red component (was at position 2)
          const gPos = palFileOffset + 1 + i * 3; // Green component
          const bPos = palFileOffset + 2 + i * 3; // Blue component (was at position 0)
          
          if (rPos < palFile.length && gPos < palFile.length && bPos < palFile.length) {
            // Read RGB values
            const r = palFile.readUInt8(rPos) * palMultiplier;
            const g = palFile.readUInt8(gPos) * palMultiplier;
            const b = palFile.readUInt8(bPos) * palMultiplier;
            
            // Write to BMP palette table
            bmpImage.writeUInt8(b, fullBmpHeaderLength + i * 4);     // B
            bmpImage.writeUInt8(g, fullBmpHeaderLength + 1 + i * 4); // G
            bmpImage.writeUInt8(r, fullBmpHeaderLength + 2 + i * 4); // R
            bmpImage.writeUInt8(0, fullBmpHeaderLength + 3 + i * 4); // A
          } else {
            // If we're past the end of the palette file, use grayscale for remaining colors
            bmpImage.writeUInt8(i, fullBmpHeaderLength + i * 4);     // B (grayscale)
            bmpImage.writeUInt8(i, fullBmpHeaderLength + 1 + i * 4); // G (grayscale)
            bmpImage.writeUInt8(i, fullBmpHeaderLength + 2 + i * 4); // R (grayscale)
            bmpImage.writeUInt8(0, fullBmpHeaderLength + 3 + i * 4); // A
          }
        } catch(e) {
          if (e instanceof RangeError) {
            console.log(`Warning: Early end of palette file at color index ${i}, will use grayscale for remaining colors`);
            
            // Fill remaining palette entries with grayscale
            for (let j = i; j < 256; j++) {
              bmpImage.writeUInt8(j, fullBmpHeaderLength + j * 4);     // B (grayscale)
              bmpImage.writeUInt8(j, fullBmpHeaderLength + 1 + j * 4); // G (grayscale)
              bmpImage.writeUInt8(j, fullBmpHeaderLength + 2 + j * 4); // R (grayscale)
              bmpImage.writeUInt8(0, fullBmpHeaderLength + 3 + j * 4); // A
            }
            break;
          } else {
            console.error(`Error processing palette: ${e.message}`);
            throw e;
          }
        }
      }
    } catch (err) {
      console.error(`Error reading palette file: ${err.message}`);
      console.log('Falling back to grayscale palette');
      // Fall back to grayscale palette
      for (let i = 0; i < 256; i++) {
        bmpImage.writeUInt8(i, fullBmpHeaderLength + i * 4);     // B (grayscale)
        bmpImage.writeUInt8(i, fullBmpHeaderLength + 1 + i * 4); // G (grayscale)
        bmpImage.writeUInt8(i, fullBmpHeaderLength + 2 + i * 4); // R (grayscale)
        bmpImage.writeUInt8(0, fullBmpHeaderLength + 3 + i * 4); // A
      }
    }
  } else { 
    // No palette or palette file doesn't exist, use grayscale
    if (palFileName) {
      console.log(`Palette file not found: ${palFileName}`);
      console.log('Using grayscale palette instead');
    } else {
      console.log('No palette specified, using grayscale');
    }
    
    for (let i = 0; i < 256; i++) {
      bmpImage.writeUInt8(i, fullBmpHeaderLength + i * 4);     // B (grayscale)
      bmpImage.writeUInt8(i, fullBmpHeaderLength + 1 + i * 4); // G (grayscale)
      bmpImage.writeUInt8(i, fullBmpHeaderLength + 2 + i * 4); // R (grayscale)
      bmpImage.writeUInt8(0, fullBmpHeaderLength + 3 + i * 4); // A
    }
  }

  // Decode the compressed image data and write it to the buffer
  let index = spitHeaderLength;
  let bufferIndex = fullBmpHeaderLength+palLength;
  let rawIndex = 0;
  let rowCounter = 0;
  while (rawIndex < expectedRawLength) {
    // console.log("index",index,compressedImage.byteOffset.toString(16).toUpperCase());
    let description;
    if (fileType == 123) { // override
      description = 1;
    } else {
      description = compressedImage.readUInt8(index++);
    }
    
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
const pal = process.argv[3];

// Check if the required parameter is provided
if (!spriteName) {
  console.log('Convert EA Sports SPIT image format to BMP\n');
  console.log('Usage: node spitToBmp.js <spitFile> [palettePath]\n');
  console.log('Parameters:');
  console.log('  spitFile    - Path to the SPIT format image file');
  console.log('  palettePath - Optional path to a palette file (.act or EA palette)\n');
  console.log('Example:');
  console.log('  node spitToBmp.js ./sprites/player.spit ./palettes/nhl.pal');
  process.exit(1);
}

// Verify the SPIT file exists
if (!fs.existsSync(spriteName)) {
  console.error(`Error: SPIT file not found: ${spriteName}`);
  process.exit(1);
}

try {
  convertToBMP(spriteName, pal);
  console.log(`Successfully converted ${spriteName} to BMP format`);
} catch (error) {
  console.error(`Error converting ${spriteName}: ${error.message}`);
  process.exit(1);
}