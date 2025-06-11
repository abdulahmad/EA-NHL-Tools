const fs = require('fs');

const output1 = fs.readFileSync('output1.bin');
const output2 = fs.readFileSync('output2.bin');

console.log('Output 1 length:', output1.length);
console.log('Output 2 length:', output2.length);

// Check if output1 matches the first part of output2
const matches = output1.equals(output2.slice(0, output1.length));
console.log('First', output1.length, 'bytes match:', matches);

if (output2.length > output1.length) {
    const extraBytes = output2.slice(output1.length);
    console.log('Extra bytes in output2:', Array.from(extraBytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
    console.log('Extra bytes count:', extraBytes.length);
}

// Show end of output1
console.log('Last 16 bytes of output1:', Array.from(output1.slice(-16)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));

// Show beginning and end of output2
console.log('First 16 bytes of output2:', Array.from(output2.slice(0, 16)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
console.log('Last 16 bytes of output2:', Array.from(output2.slice(-16)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
