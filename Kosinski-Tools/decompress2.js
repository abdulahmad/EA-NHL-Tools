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

// Example usage
// const compressedHex = "00 00 04 c4 00 00 05 44 04 03 66 66 66 ..."; // Replace with actual data
// const decompressedHex = decompressMapJim(compressedHex);
// console.log(decompressedHex);

module.exports = { decompressMapJim };