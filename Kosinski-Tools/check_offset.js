const fs = require('fs');
const data = fs.readFileSync('output_fixed.bin');
console.log('Total length:', data.length);
console.log('Last position:', data.length-1);
console.log('Offset -143 points to position:', data.length - 143);
if (data.length >= 143) {
    const pos = data.length - 143;
    console.log('Bytes at offset -143:', data.slice(pos, pos+3).toString('hex'));
    console.log('Expected: 11 77 77');
} else {
    console.log('Offset -143 is beyond available data');
}
