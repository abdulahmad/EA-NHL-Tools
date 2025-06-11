const { NHL94Decompressor } = require('./nhl94-decompressor.js');
const fs = require('fs');

const buffer = fs.readFileSync('../test-short.bin');
const decompressor = new NHL94Decompressor();

console.log('Input data:', Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join(' '));
console.log();

console.log('=== Testing offset 0 ===');
try {
  const result0 = decompressor.decompress(Array.from(buffer), 0, true);
  console.log('Output length:', result0.length);
  console.log('Output data:', Array.from(result0).map(b => b.toString(16).padStart(2, '0')).join(' '));
  console.log('Score:', decompressor.scoreDecompression(result0));
} catch (e) {
  console.log('Error:', e.message);
}

console.log();
console.log('=== Testing offset 3 ===');
try {
  const result3 = decompressor.decompress(Array.from(buffer), 3, true);
  console.log('Output length:', result3.length);
  console.log('Output data:', Array.from(result3).map(b => b.toString(16).padStart(2, '0')).join(' '));
  console.log('Score:', decompressor.scoreDecompression(result3));
} catch (e) {
  console.log('Error:', e.message);
}
