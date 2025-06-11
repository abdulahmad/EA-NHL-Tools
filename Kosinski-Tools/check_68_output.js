const fs = require('fs');

const output = fs.readFileSync('test_68_output.bin');
console.log('Output length:', output.length);
console.log('Last 10 bytes:', Array.from(output.slice(-10)).map(b => b.toString(16).padStart(2, '0')).join(' '));

// Expected output should end with: 11 77
const lastTwoBytes = Array.from(output.slice(-2)).map(b => b.toString(16).padStart(2, '0')).join(' ');
console.log('Last 2 bytes:', lastTwoBytes);

if (lastTwoBytes === '11 77') {
    console.log('✅ SUCCESS: Output ends with expected "11 77"');
} else {
    console.log('❌ FAILURE: Expected "11 77" but got "' + lastTwoBytes + '"');
}

// Also check the complete expected sequence
const expectedEnd = '11 77 77 77 99 88 11 77';
const actualEnd = Array.from(output.slice(-8)).map(b => b.toString(16).padStart(2, '0')).join(' ');
console.log('Expected last 8 bytes:', expectedEnd);
console.log('Actual last 8 bytes:  ', actualEnd);

if (actualEnd === expectedEnd) {
    console.log('✅ PERFECT: Complete ending sequence matches!');
}
