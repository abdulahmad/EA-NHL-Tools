const fs = require('fs');

function decodeRefPackData(refPackData) {
  const numBytes = refPackData.length;
  let srcIndex = 0, dstIndex = 0;
  const output = new Uint8Array(4096);

  while (srcIndex < numBytes) {
    const code = refPackData[srcIndex++];
    if (code & 0x80) {
      // Literal code
      output[dstIndex++] = code;
    } else {
      // Reference code
      let refIndex = ((code & 0x7f) << 8) | refPackData[srcIndex++];
      let refLength = (code >> 7) + 2;

      // Copy reference data to output buffer
      for (let i = 0; i < refLength; i++) {
        output[dstIndex++] = output[dstIndex - refIndex];
      }
    }
  }

  return output.slice(0, dstIndex);
}

// Read refpack data from file
const refPackData = fs.readFileSync(process.argv[2]);

// Decode refpack data
const decodedData = decodeRefPackData(refPackData);

// Write decoded data to file
fs.writeFileSync('data.bin', decodedData);
