const fs = require('fs');

// Expected output from the prompt
const expectedHex = "66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92 66 66 66 66 55 55 55 55 44 44 44 44 77 11 11 11 11 22 28 82 22 33 32 22 34 44 32 98 22 99 98 88 66 66 66 66 55 55 55 55 44 44 44 44 11 77 77 77 99 88 11 77 98 11 18 77 81 11 11 11 11 11 11 11 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 82 87 77 77 66 66 66 61 55 55 55 21 44 44 43 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 77 77 73 21 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 77 77 77 77 77 77 77 77 77 77 77 71 77 77 77 18 77 77 77 18 77 77 77 18 77 77";

function hexStringToBuffer(hexString) {
    const bytes = hexString.split(' ').map(hex => parseInt(hex, 16));
    return Buffer.from(bytes);
}

const expectedBuffer = hexStringToBuffer(expectedHex);
const actualOutput1 = fs.readFileSync('output1.bin');

console.log('Expected output length:', expectedBuffer.length);
console.log('Actual output1 length:', actualOutput1.length);
console.log('Outputs match:', expectedBuffer.equals(actualOutput1));

if (!expectedBuffer.equals(actualOutput1)) {
    // Find the first difference
    for (let i = 0; i < Math.min(expectedBuffer.length, actualOutput1.length); i++) {
        if (expectedBuffer[i] !== actualOutput1[i]) {
            console.log(`First difference at byte ${i}: expected 0x${expectedBuffer[i].toString(16).padStart(2, '0')}, got 0x${actualOutput1[i].toString(16).padStart(2, '0')}`);
            break;
        }
    }
}

console.log('First 16 bytes expected:', Array.from(expectedBuffer.slice(0, 16)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
console.log('First 16 bytes actual:  ', Array.from(actualOutput1.slice(0, 16)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
