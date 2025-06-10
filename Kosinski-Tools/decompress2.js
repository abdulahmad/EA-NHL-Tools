const fs = require('fs');

// Read big-endian uint32 from buffer
function readUInt32BE(buffer, offset) {
  return (buffer[offset] << 24) | (buffer[offset + 1] << 16) | (buffer[offset + 2] << 8) | buffer[offset + 3];
}

// Read uint16 from memory (emulating MOVE.W)
function readUInt16(memory, addr) {
  return (memory[addr] << 8) | memory[addr + 1];
}

// Write uint16 to memory (emulating MOVE.W)
function writeUInt16(memory, addr, value) {
  memory[addr] = (value >> 8) & 0xFF;
  memory[addr + 1] = value & 0xFF;
}

// Decompression function for tile data based on assembly logic
function decompressTileData(compressed, start, end, memory) {
  let output = [];
  let inputPos = start;
  let outputPos = 0;

  while (inputPos < end) {
    // Read command byte from input stream (not memory $D048 as initially assumed)
    let cmd = compressed[inputPos++];

    if (cmd === 4) {
      // Literal Copy: Copy 'count' bytes directly
      let count = compressed[inputPos++];
      for (let i = 0; i < count; i++) {
        if (inputPos >= end) break;
        output[outputPos++] = compressed[inputPos++];
      }
    } else if (cmd <= 2) {
      // Repeat Copy: Repeat a value 'count' times
      let count = compressed[inputPos++];
      let value = compressed[inputPos++];
      for (let i = 0; i < count; i++) {
        output[outputPos++] = value;
      }
    } else if (cmd === 1) {
      // Offset Copy: Copy 'count' bytes from 'offset' bytes back
      let offset = compressed[inputPos++];
      let count = compressed[inputPos++];
      let srcPos = outputPos - offset;
      if (srcPos < 0) throw new Error(`Invalid offset at inputPos ${inputPos - 3}`);
      for (let i = 0; i < count; i++) {
        output[outputPos++] = output[srcPos++];
      }
    } else {
      // Unknown command; assuming it's part of a different subroutine or data
      console.warn(`Unknown command byte: ${cmd} at position ${inputPos - 1}, skipping`);
      continue;
    }
  }
  return output;
}

// Main decompression function for .map.jim files
function decompressMapJim(compressedHex) {
  const compressed = compressedHex.split(' ').map(x => parseInt(x, 16));
  const memory = new Uint8Array(0x10000); // Emulate 64KB memory

  // Read header offsets (palette and map)
  const paletteOffset = readUInt32BE(compressed, 0);
  const mapOffset = readUInt32BE(compressed, 4);

  // Store offsets in memory locations as per assembly ($BF12, $BF14)
  writeUInt16(memory, 0xBF12, paletteOffset & 0xFFFF);
  writeUInt16(memory, 0xBF14, mapOffset & 0xFFFF);

  // Decompress tile data from byte 8 to paletteOffset
  const tileData = decompressTileData(compressed, 8, paletteOffset, memory);
  const tileCount = Math.floor(tileData.length / 32); // Each tile is 32 bytes

  // Extract uncompressed palette and map data
  const paletteData = compressed.slice(paletteOffset, mapOffset);
  const mapData = compressed.slice(mapOffset);

  // Reconstruct decompressed file
  const decompressed = [
    ...compressed.slice(0, 8), // Header (palette and map offsets)
    tileCount & 0xFF,         // Low byte of tile count
    ...tileData,              // Decompressed tile data
    ...paletteData,           // Uncompressed palette data
    ...mapData                // Uncompressed map data
  ];

  // Convert to hex string
  return Buffer.from(decompressed).toString('hex').match(/.{1,2}/g).join(' ');
}

// Function to read hex data from file (supports both binary and hex text files)
function readHexFromFile(filePath) {
  const fileContent = fs.readFileSync(filePath);
  
  // Try to detect if file is binary or hex text
  const isTextFile = fileContent.every(byte => byte >= 32 && byte <= 126 || byte === 9 || byte === 10 || byte === 13);
  
  if (isTextFile) {
    // Assume it's a hex text file (space or newline separated hex values)
    return fileContent.toString().replace(/[^0-9a-fA-F]/g, ' ').trim();
  } else {
    // It's a binary file, convert to hex string
    return Buffer.from(fileContent).toString('hex').match(/.{1,2}/g).join(' ');
  }
}

// Function to write decompressed data to file
function writeHexToFile(filePath, hexString) {
  // Convert hex string back to binary data
  const hexBytes = hexString.split(' ').map(hex => parseInt(hex, 16));
  const buffer = Buffer.from(hexBytes);
  fs.writeFileSync(filePath, buffer);
}

// Main function for command-line usage
function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.log('Usage: node decompress2.js <input_file> <output_file>');
    console.log('');
    console.log('Example:');
    console.log('  node decompress2.js input.map.jim output.decompressed');
    console.log('');
    console.log('Input file can be either:');
    console.log('  - Binary .map.jim file');
    console.log('  - Text file with hex data (space-separated)');
    process.exit(1);
  }
  
  const inputFile = args[0];
  const outputFile = args[1];
  
  try {
    console.log(`Reading compressed data from: ${inputFile}`);
    const compressedHex = readHexFromFile(inputFile);
    
    console.log('Decompressing data...');
    const decompressedHex = decompressMapJim(compressedHex);
    
    console.log(`Writing decompressed data to: ${outputFile}`);
    writeHexToFile(outputFile, decompressedHex);
    
    console.log('Decompression completed successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run main function if script is executed directly
if (require.main === module) {
  main();
}

module.exports = { decompressMapJim, readHexFromFile, writeHexToFile };