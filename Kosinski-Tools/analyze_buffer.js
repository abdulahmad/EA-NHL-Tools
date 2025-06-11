const fs = require('fs');
const data = fs.readFileSync('test_before_82_output.bin');
console.log('Output buffer length before 82 80:', data.length);

const lastBytes = Array.from(data.slice(-10)).map(b => b.toString(16).padStart(2, '0')).join(' ');
console.log('Last 10 bytes:', lastBytes);

// Search for the pattern 77 77 66 66 66 in the output buffer
const pattern = [0x77, 0x77, 0x66, 0x66, 0x66];
const buffer = Array.from(data);

for (let i = 0; i <= buffer.length - pattern.length; i++) {
    let match = true;
    for (let j = 0; j < pattern.length; j++) {
        if (buffer[i + j] !== pattern[j]) {
            match = false;
            break;
        }
    }
    if (match) {
        const offsetFromEnd = buffer.length - i;
        console.log(`Found pattern "77 77 66 66 66" at position ${i}, offset from end: ${offsetFromEnd}`);
    }
}

// Look for any occurrence of 77 77 66
const pattern2 = [0x77, 0x77, 0x66];
for (let i = 0; i <= buffer.length - pattern2.length; i++) {
    let match = true;
    for (let j = 0; j < pattern2.length; j++) {
        if (buffer[i + j] !== pattern2[j]) {
            match = false;
            break;
        }
    }
    if (match) {
        const offsetFromEnd = buffer.length - i;
        console.log(`Found pattern "77 77 66" at position ${i}, offset from end: ${offsetFromEnd}`);
    }
}
