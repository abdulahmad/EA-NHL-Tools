// Create the actual test files from the prompt
const fs = require('fs');

// First file data (should work correctly)
const file1Data = "31 66 00 65 30 55 00 65 30 44 03 65 47 77 77 8D 04 31 66 31 55 31 44 3F 77 9B 1F 00 18 51 00 88 51 00 92 8A 20 31 11 0E 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 89 20 00 11 30 77 01 99 88 68 04 98 11 18 77 81 34 11 9C FF 01 82 87 82 80 00 61 30 55 07 21 44 44 43 21 77 77 73 8E 04 8F D4 8B 04 38 77 00 71 83 B8";

// Second file data (has the extra 5E)
const file2Data = "31 66 00 65 30 55 00 65 30 44 03 65 47 77 77 8D 04 31 66 31 55 31 44 3F 77 9B 1F 00 18 51 00 88 51 00 92 8A 20 31 11 0E 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 89 20 00 11 30 77 01 99 88 68 04 98 11 18 77 81 34 11 9C FF 01 82 87 82 80 00 61 30 55 07 21 44 44 43 21 77 77 73 8E 04 8F D4 8B 04 38 77 00 71 83 B8 5E";

function hexStringToBuffer(hexString) {
    const bytes = hexString.split(' ').map(hex => parseInt(hex, 16));
    return Buffer.from(bytes);
}

// Create test files
const file1Buffer = hexStringToBuffer(file1Data);
const file2Buffer = hexStringToBuffer(file2Data);

fs.writeFileSync('test_file1.bin', file1Buffer);
fs.writeFileSync('test_file2.bin', file2Buffer);

console.log('Created test files:');
console.log(`test_file1.bin: ${file1Buffer.length} bytes (ends with 83 B8)`);
console.log(`test_file2.bin: ${file2Buffer.length} bytes (ends with 83 B8 5E)`);
