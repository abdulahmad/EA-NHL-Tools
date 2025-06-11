const fs = require('fs');

// Let's check what the output buffer looks like before the 82 80 command
// The expected output should be: 82 87 77 77 66 66 66
// So before 82 80, we should have: ... 82 87
// And somewhere earlier we should have: 77 77 66 66 66

const expectedBeforeCommand = [0x82, 0x87];
const expectedToCopy = [0x77, 0x77, 0x66, 0x66, 0x66];

// Create the first part (without 82 80) to see what's in the buffer
const hexString1 = '31 66 00 65 30 55 00 65 30 44 03 65 47 77 77 8D 04 31 66 31 55 31 44 3F 77 9B 1F 00 18 51 00 88 51 00 92 8A 20 31 11 0E 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 89 20 00 11 30 77 01 99 88 68 04 98 11 18 77 81 34 11 9C FF 01 82 87';
const bytes1 = hexString1.split(' ').map(h => parseInt(h, 16));
fs.writeFileSync('test_before_82.bin', Buffer.from(bytes1));
console.log('Created test file before 82 80 command with', bytes1.length, 'bytes');
