const fs = require('fs');
const data = fs.readFileSync('test_output_82.bin');
const lastBytes = Array.from(data.slice(-20)).map(b => b.toString(16).padStart(2, '0')).join(' ');
console.log('Last 20 bytes:', lastBytes);
console.log('Total length:', data.length);

// Also check if the expected sequence appears
const expectedEnd = [0x82, 0x87, 0x77, 0x77, 0x66, 0x66, 0x66];
const actualEnd = Array.from(data.slice(-7));
console.log('Expected end:', expectedEnd.map(b => b.toString(16).padStart(2, '0')).join(' '));
console.log('Actual end:  ', actualEnd.map(b => b.toString(16).padStart(2, '0')).join(' '));
console.log('Match:', JSON.stringify(expectedEnd) === JSON.stringify(actualEnd));
