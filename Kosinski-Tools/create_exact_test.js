const fs = require('fs');

// Create a simple test to check what happens at the exact moment of 82 80 command
// The sequence is: ... 9C FF 01 82 87 82 80
// So right before 82 80, we should have added "82 87" to the buffer

// Let's create the exact sequence before 82 80
const partialHex = '31 66 00 65 30 55 00 65 30 44 03 65 47 77 77 8D 04 31 66 31 55 31 44 3F 77 9B 1F 00 18 51 00 88 51 00 92 8A 20 31 11 0E 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 89 20 00 11 30 77 01 99 88 68 04 98 11 18 77 81 34 11 9C FF 01 82 87';
const bytes = partialHex.split(' ').map(h => parseInt(h, 16));
fs.writeFileSync('test_exact_before_82.bin', Buffer.from(bytes));
console.log('Created test file with', bytes.length, 'bytes, ending with "01 82 87"');
