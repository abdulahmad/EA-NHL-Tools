const { NHL94Decompressor } = require('./nhl94-decompressor.js');
const fs = require('fs');

const buffer = fs.readFileSync('../test-short.bin');
const decompressor = new NHL94Decompressor();

console.log('Input data:', Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join(' '));
console.log();

// Test offset 0
console.log('=== Testing offset 0 ===');
const result0 = decompressor.decompress(Array.from(buffer), 0, false);
const zeroCount0 = Array.from(result0).filter(b => b === 0).length;
const zeroRatio0 = zeroCount0 / result0.length;
console.log('Output length:', result0.length);
console.log('Zero count:', zeroCount0);
console.log('Zero ratio:', zeroRatio0);
console.log('Score:', decompressor.scoreDecompression(result0));
console.log();

// Test offset 3
console.log('=== Testing offset 3 ===');
const result3 = decompressor.decompress(Array.from(buffer), 3, false);
const zeroCount3 = Array.from(result3).filter(b => b === 0).length;
const zeroRatio3 = zeroCount3 / result3.length;
console.log('Output length:', result3.length);
console.log('Zero count:', zeroCount3);
console.log('Zero ratio:', zeroRatio3);
console.log('Score:', decompressor.scoreDecompression(result3));
console.log('Output data:', Array.from(result3).map(b => b.toString(16).padStart(2, '0')).join(' '));
