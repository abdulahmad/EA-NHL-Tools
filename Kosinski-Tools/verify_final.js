const fs = require('fs');
const data = fs.readFileSync('test_final_82.bin');
const expectedEnd = [0x82, 0x87, 0x77, 0x77, 0x66, 0x66, 0x66];
const actualEnd = Array.from(data.slice(-7));
console.log('Final test - Expected end: 82 87 77 77 66 66 66');
console.log('Final test - Actual end:  ', actualEnd.map(b => b.toString(16).padStart(2, '0')).join(' '));
console.log('Final test - Match:', JSON.stringify(expectedEnd) === JSON.stringify(actualEnd));
console.log('Final test - Total length:', data.length);
