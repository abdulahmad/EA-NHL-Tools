const fs = require('fs');

function decompressKosinski(filePath, offset, headerSize = 8) {
  // Read the file into a buffer
  const buffer = fs.readFileSync(filePath);
  let srcIndex = offset + headerSize; // Skip header
  const output = []; // Decompressed data
  let bitField = 0; // Bitstream for control codes
  let bitsLeft = 0; // Number of bits left in bitField

  // Log header if present
  if (headerSize > 0 && offset + headerSize <= buffer.length) {
    const header = buffer.slice(offset, offset + headerSize);
    console.log(`Header at offset 0x${offset.toString(16).padStart(6, '0')}: ${header.toString('hex')}`);
  } else if (headerSize > 0) {
    console.warn(`Warning: Header size ${headerSize} exceeds file length at offset 0x${offset.toString(16).padStart(6, '0')}`);
  }

  // Function to read the next bit from the bitstream
  function readBit() {
    if (srcIndex >= buffer.length) {
      throw new Error(`Unexpected end of file at offset 0x${srcIndex.toString(16).padStart(6, '0')}`);
    }
    if (bitsLeft === 0) {
      bitField = buffer.readUInt8(srcIndex++);
      bitsLeft = 8;
      console.log(`Read bitfield: 0x${bitField.toString(16).padStart(2, '0')} at offset 0x${(srcIndex - 1).toString(16).padStart(6, '0')}`);
    }
    const bit = (bitField >> (bitsLeft - 1)) & 1;
    bitsLeft--;
    return bit;
  }

  // Function to read n bits from the bitstream
  function readBits(n) {
    let result = 0;
    for (let i = 0; i < n; i++) {
      result = (result << 1) | readBit();
    }
    return result;
  }

  // Main decompression loop
  try {
    while (srcIndex < buffer.length) {
      // Read descriptor field (2 bits)
      const descriptor = readBits(2);
      console.log(`Descriptor: ${descriptor.toString(2).padStart(2, '0')} (0x${descriptor.toString(16)}) at offset 0x${srcIndex.toString(16).padStart(6, '0')}`);

      if (descriptor === 0) {
        console.log('End of stream (descriptor 00)');
        break;
      } else if (descriptor === 3) {
        // Literal byte
        if (srcIndex >= buffer.length) {
          throw new Error('Unexpected end of file while reading literal byte');
        }
        const byte = buffer.readUInt8(srcIndex++);
        output.push(byte);
        console.log(`Literal byte: 0x${byte.toString(16).padStart(2, '0')}`);
      } else {
        // Back-reference
        let count, offset;
        if (descriptor === 2) {
          // Short back-reference (2-5 bytes)
          count = readBits(2) + 2;
          if (srcIndex >= buffer.length) {
            throw new Error('Unexpected end of file while reading short back-reference');
          }
          offset = buffer.readUInt8(srcIndex++);
          console.log(`Short back-reference: count=${count}, offset=0x${offset.toString(16).padStart(2, '0')}`);
          if (offset === 0) {
            console.log('End of stream (zero offset)');
            break;
          }
        } else if (descriptor === 1) {
          // Long back-reference (2-9 bytes)
          if (srcIndex + 1 >= buffer.length) {
            throw new Error('Unexpected end of file while reading long back-reference');
          }
          const byte1 = buffer.readUInt8(srcIndex++);
          const byte2 = buffer.readUInt8(srcIndex++);
          count = (byte2 & 0x07) + 2;
          offset = ((byte1 << 5) | (byte2 >> 3)) & 0x1FFF;
          console.log(`Long back-reference: count=${count}, offset=0x${offset.toString(16).padStart(4, '0')}, bytes=0x${byte1.toString(16).padStart(2, '0')} 0x${byte2.toString(16).padStart(2, '0')}`);
          if (count === 2 && offset === 0) {
            console.log('End of stream (long back-reference terminator)');
            break;
          }
        } else {
          throw new Error(`Invalid descriptor ${descriptor} at offset 0x${srcIndex.toString(16).padStart(6, '0')}`);
        }
        // Validate and copy bytes
        if (offset > output.length) {
          console.error(`Invalid offset 0x${offset.toString(16).padStart(4, '0')} at output length ${output.length}`);
          return Buffer.from([]); // Early exit to match previous behavior
        }
        for (let i = 0; i < count; i++) {
          output.push(output[output.length - offset + i]);
        }
        console.log(`Copied ${count} bytes from output index ${output.length - offset}`);
      }
    }
  } catch (err) {
    console.error(`Decompression error: ${err.message}`);
    return Buffer.from([]);
  }

  // Log decompressed size
  console.log(`Decompressed ${output.length} bytes`);
  return Buffer.from(output);
}

// Command-line interface
const args = process.argv.slice(2);
if (args.length < 2 || args.length > 3) {
  console.error('Usage: node kosinski_decompress.js <filename> <offset> [headerSize]');
  console.error('Example: node kosinski_decompress.js game.rom 0x0B389C 8');
  process.exit(1);
}

const filePath = args[0];
const offset = parseInt(args[1], 16); // Support hex offset (e.g., 0x0B389C)
const headerSize = args[2] ? parseInt(args[2], 10) : 8; // Default to 8-byte header
try {
  const decompressed = decompressKosinski(filePath, offset, headerSize);
  if (decompressed.length > 0) {
    fs.writeFileSync('decompressed.bin', decompressed);
    console.log(`Saved decompressed data to decompressed.bin`);
  } else {
    console.log('No data decompressed. Check offset, header size, or compression format.');
  }
} catch (err) {
  console.error('Error:', err.message);
}