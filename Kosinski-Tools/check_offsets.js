const fs = require('fs');
const data = fs.readFileSync('test_before_82_output.bin');
console.log('Output buffer length before 82 80:', data.length);

// Check what's at different offsets from the end
for (let offset = 125; offset <= 135; offset++) {
    const pos = data.length - offset;
    if (pos >= 0 && pos + 4 < data.length) {
        const bytes = Array.from(data.slice(pos, pos + 5)).map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.log(`Offset ${offset}: position ${pos} = ${bytes}`);
    }
}

// Also check what's at the exact positions where the pattern was found
console.log('\nPattern locations:');
const positions = [30, 62]; // Found earlier
for (const pos of positions) {
    const bytes = Array.from(data.slice(pos, pos + 5)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    const offsetFromEnd = data.length - pos;
    console.log(`Position ${pos} (offset ${offsetFromEnd}): ${bytes}`);
}
