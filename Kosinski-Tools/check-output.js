const fs = require('fs');

const data = fs.readFileSync('output_test.bin');
const last20 = Array.from(data.slice(-20)).map(b => b.toString(16).padStart(2, '0')).join(' ');
console.log('Last 20 bytes:', last20);

const expected = '77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77';
const actual = Array.from(data.slice(-18)).map(b => b.toString(16).padStart(2, '0')).join(' ');
console.log('Expected ending: ', expected);
console.log('Actual ending:   ', actual);
console.log('Match:', actual === expected);
