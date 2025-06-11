const fs = require('fs');

// Create a simple test .map.jim file for testing
// .map.jim format: [header][palette][compressed_data]

const header = Buffer.alloc(0x208, 0); // 520 bytes of header/palette data

// Test compressed data - using the same data from our successful test
const compressedData = Buffer.from([
    0x31, 0x66, 0x00, 0x65, 0x30, 0x55, 0x00, 0x65, 0x30, 0x44, 0x03, 0x65, 0x47, 0x77, 0x77, 0x8D, 
    0x04, 0x31, 0x66, 0x31, 0x55, 0x31, 0x44, 0x3F, 0x77, 0x9B, 0x1F, 0x00, 0x18, 0x51, 0x00, 0x88, 
    0x51, 0x00, 0x92, 0x8A, 0x20
]);

// Combine header and compressed data
const testFile = Buffer.concat([header, compressedData]);

// Write test file
fs.writeFileSync('test-sample.map.jim', testFile);

console.log(`Created test-sample.map.jim (${testFile.length} bytes total)`);
console.log(`Header size: ${header.length} bytes`);
console.log(`Compressed data size: ${compressedData.length} bytes`);
console.log(`Compressed data: ${Array.from(compressedData).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
