const fs = require('fs');
const data = fs.readFileSync('test_debug_82.bin');
console.log('Final output length:', data.length);
const lastBytes = Array.from(data.slice(-10)).map(b => b.toString(16).padStart(2, '0')).join(' ');
console.log('Last 10 bytes:', lastBytes);

// Check if the expected sequence appears
const expectedEnd = [0x82, 0x87, 0x77, 0x77, 0x66, 0x66, 0x66];
const actualEnd = Array.from(data.slice(-7));
console.log('Expected end: 82 87 77 77 66 66 66');
console.log('Actual end:  ', actualEnd.map(b => b.toString(16).padStart(2, '0')).join(' '));
console.log('Match:', JSON.stringify(expectedEnd) === JSON.stringify(actualEnd));
