const fs = require('fs');

const expectedHex = "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77";

const expectedBuffer = Buffer.from(expectedHex.split(' ').map(h => parseInt(h, 16)));
const actualOutput1 = fs.readFileSync('output1.bin');

console.log('Expected length:', expectedBuffer.length);
console.log('Actual length:', actualOutput1.length);

const matches = expectedBuffer.slice(0, actualOutput1.length).equals(actualOutput1);
console.log('First', actualOutput1.length, 'bytes match expected:', matches);
