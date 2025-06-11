const fs = require('fs');
const data = fs.readFileSync('test_exact_output.bin');
console.log('Exact output buffer length:', data.length);
console.log('Last 10 bytes:', Array.from(data.slice(-10)).map(b => b.toString(16).padStart(2, '0')).join(' '));

// Now check what would be at offset 128 when we're about to execute 82 80
const offsetPos = data.length - 128;
console.log(`\nAt offset 128 (position ${offsetPos}):`);
if (offsetPos >= 0 && offsetPos + 4 < data.length) {
    const bytes = Array.from(data.slice(offsetPos, offsetPos + 5)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log(`Bytes: ${bytes}`);
}

// Let's also try offset 127 and 129 to see nearby
for (let off = 126; off <= 130; off++) {
    const pos = data.length - off;
    if (pos >= 0 && pos + 4 < data.length) {
        const bytes = Array.from(data.slice(pos, pos + 5)).map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.log(`Offset ${off} (pos ${pos}): ${bytes}`);
    }
}
