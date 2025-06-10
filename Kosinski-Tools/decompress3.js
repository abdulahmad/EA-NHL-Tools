const fs = require('fs');

// Global registers emulated as variables
let a0 = 0; // Input pointer (compressed data)
let a1 = 0; // Output pointer (decompressed data)
let d0 = 0; // Length or counter
let d1 = 0; // Counter for subroutine calls
let d2 = 0; // Offset or value
let compressedData = null;
let output = [];

// Placeholder for subroutine at $1196E (buffer management or flag update)
function sub_1196E() {
  // Without full context, assume it's a no-op or counter adjustment
  // Could involve memory at $B028, $B02A, $B02E, but unclear without ROM context
  // For now, do nothing as it doesn't directly affect output in isolation
}

// Handlers for commands 0x80-0xFF based on disassembly

function handleCommand80to8F() {
  // $118A6: Commands 0x80-0x8F
  const command = compressedData[a0 - 1];
  d0 = (command & 0x0F) + 2; // Length
  d2 = compressedData[a0]; // Offset
  a0++;
  d2 = -d2; // NEG.B D2
  do {
    const offset = (a1 + d2) & 0xFFFF;
    output[a1] = output[offset];
    a1++;
    d2++; // ADDQ.W #1,D2
    d1 = (d1 + 1) & 0xFFFF;
    if (d1 !== 0) sub_1196E();
  } while (--d0 >= 0);
}

function handleCommand90to9F() {
  // $118B4: Commands 0x90-0x9F
  const command = compressedData[a0 - 1];
  const nextByte = compressedData[a0];
  a0++;
  d0 = ((command << 1) | ((nextByte & 0x80) >> 7)) & 0x1F;
  d0 += 2;
  d2 = (nextByte & 0x7F) + 1;
  d2 = -d2; // NEG.B D2
  do {
    const offset = (a1 + d2) & 0xFFFF;
    output[a1] = output[offset];
    a1++;
    d2++; // ADDQ.W #1,D2
    d1 = (d1 + 1) & 0xFFFF;
    if (d1 !== 0) sub_1196E();
  } while (--d0 >= 0);
}

function handleCommandA0toAF() {
  // $118CE: Commands 0xA0-0xAF
  const command = compressedData[a0 - 1];
  const nextByte = compressedData[a0];
  a0++;
  let temp = (command << 8) | nextByte;
  d0 = (temp >> 6) & 0x3F;
  d0 += 2;
  d2 = nextByte & 0x3F;
  d2 += 1;
  d2 = -d2; // NEG.B D2
  do {
    const offset = (a1 + d2) & 0xFFFF;
    output[a1] = output[offset];
    a1++;
    d2++; // ADDQ.W #1,D2
    d1 = (d1 + 1) & 0xFFFF;
    if (d1 !== 0) sub_1196E();
  } while (--d0 >= 0);
}

function handleCommandB0toBF() {
  // $118E8: Commands 0xB0-0xBF
  const command = compressedData[a0 - 1];
  const nextByte = compressedData[a0];
  a0++;
  let temp = (command << 8) | nextByte;
  d0 = (temp >> 5) & 0x7F;
  d0 += 2;
  d2 = nextByte & 0x1F;
  d2 += 1;
  d2 = -d2; // NEG.B D2
  do {
    const offset = (a1 + d2) & 0xFFFF;
    output[a1] = output[offset];
    a1++;
    d2++; // ADDQ.W #1,D2
    d1 = (d1 + 1) & 0xFFFF;
    if (d1 !== 0) sub_1196E();
  } while (--d0 >= 0);
}

function handleCommandC0toDF() {
  // $11902: Commands 0xC0-0xDF
  const command = compressedData[a0 - 1];
  d0 = (command & 0x03) + 1;
  d2 = ((command >> 2) & 0x07) + 1;
  d2 = -d2; // NEG.B D2
  do {
    const offset = (a1 + d2) & 0xFFFF;
    output[a1] = output[offset];
    a1++;
    d2--; // SUBQ.W #1,D2
    d1 = (d1 + 1) & 0xFFFF;
    if (d1 !== 0) sub_1196E();
  } while (--d0 >= 0);
}

function handleCommandE0toEF() {
  // $11934: Commands 0xE0-0xEF
  const command = compressedData[a0 - 1];
  d0 = (command & 0x0F) + 2;
  d2 = compressedData[a0];
  a0++;
  if (d2 !== 0) {
    d2 = -d2; // NEG.B D2
    do {
      const offset = (a1 + d2) & 0xFFFF;
      output[a1] = output[offset];
      a1++;
      d2--; // SUBQ.W #1,D2
      d1 = (d1 + 1) & 0xFFFF;
      if (d1 !== 0) sub_1196E();
    } while (--d0 >= 0);
  } else {
    if (d1 === 0) sub_1196E();
    a0 = compressedData.length; // End decompression
  }
}

function handleCommandF0toFF() {
  // $11954: Commands 0xF0-0xFF
  const command = compressedData[a0 - 1];
  const nextByte = compressedData[a0];
  a0++;
  d0 = ((command << 1) | ((nextByte & 0x80) >> 7)) & 0x1F;
  d0 += 2;
  d2 = (nextByte & 0x7F) + 1;
  d2 = -d2 + (d1 & 0xFF); // NEG.B D2 + ADD.B D1,D2
  do {
    const offset = (a1 + d2) & 0xFFFF;
    output[a1] = output[offset];
    a1++;
    d2--; // SUBQ.W #1,D2
    d1 = (d1 + 1) & 0xFFFF;
    if (d1 !== 0) sub_1196E();
  } while (--d0 >= 0);
}

// Placeholder handlers for 0x00-0x7F (assumed from prior context)
function handleCommand0to1F() {
  const command = compressedData[a0 - 1];
  d0 = (command & 0x1F);
  if (d0 === 0) d0 = 0x20; // Adjust for command 0x00
  do {
    output[a1] = compressedData[a0];
    a1++;
    a0++;
    d1 = (d1 + 1) & 0xFFFF;
    if (d1 !== 0) sub_1196E();
  } while (--d0 >= 0);
}

function handleCommand20to2F() {
  const command = compressedData[a0 - 1];
  d0 = (command & 0x0F) + 1;
  do {
    output[a1] = 0;
    a1++;
    d1 = (d1 + 1) & 0xFFFF;
    if (d1 !== 0) sub_1196E();
  } while (--d0 >= 0);
}

function handleCommand30to3F() {
  const command = compressedData[a0 - 1];
  d0 = (command & 0x0F) + 4;
  d2 = compressedData[a0];
  a0++;
  do {
    output[a1] = d2;
    a1++;
    d1 = (d1 + 1) & 0xFFFF;
    if (d1 !== 0) sub_1196E();
  } while (--d0 >= 0);
}

function handleCommand40to7F() {
  const command = compressedData[a0 - 1];
  d0 = (command & 0x07) + 1;
  d2 = (command & 0x38) >> 3;
  d2 = (d2 + 1) * -8;
  do {
    const offset = (a1 + d2) & 0xFFFF;
    output[a1] = output[offset];
    a1++;
    d2++;
    d1 = (d1 + 1) & 0xFFFF;
    if (d1 !== 0) sub_1196E();
  } while (--d0 >= 0);
}

// Jump table mapping command type to handler
const handlers = [
  handleCommand0to1F,   // 0x00-0x0F
  handleCommand0to1F,   // 0x10-0x1F
  handleCommand20to2F,  // 0x20-0x2F
  handleCommand30to3F,  // 0x30-0x3F
  handleCommand40to7F,  // 0x40-0x4F
  handleCommand40to7F,  // 0x50-0x5F
  handleCommand40to7F,  // 0x60-0x6F
  handleCommand40to7F,  // 0x70-0x7F
  handleCommand80to8F,  // 0x80-0x8F
  handleCommand90to9F,  // 0x90-0x9F
  handleCommandA0toAF,  // 0xA0-0xAF
  handleCommandB0toBF,  // 0xB0-0xBF
  handleCommandC0toDF,  // 0xC0-0xCF
  handleCommandC0toDF,  // 0xD0-0xDF
  handleCommandE0toEF,  // 0xE0-0xEF
  handleCommandF0toFF   // 0xF0-0xFF
];

// Main decompression function
function decompressMapJim(compressedBuffer) {
  compressedData = compressedBuffer;
  output = [];
  a0 = 0;
  a1 = 0;
  d0 = 0;
  d1 = 0;
  d2 = 0;

  while (a0 < compressedData.length) {
    const command = compressedData[a0];
    a0++;
    const cmdType = (command & 0xF0) >> 4;
    handlers[cmdType]();
  }

  return Buffer.from(output);
}

// Example usage
if (require.main === module) {
  const compressedFile = process.argv[2];
  if (!compressedFile) {
    console.error('Please provide a compressed .map.jim file as argument');
    process.exit(1);
  }

  const compressedData = fs.readFileSync(compressedFile);
  const decompressedData = decompressMapJim(compressedData);
  fs.writeFileSync('output.bin', decompressedData);
  console.log('Decompression complete. Output written to output.bin');
}