const { NHL94Decompressor } = require('./nhl94-decompressor.js');

// Test data up to just before the 80 command
const testDataBefore80 = [0x31, 0x66, 0x00, 0x65, 0x30, 0x55, 0x00, 0x65, 0x30, 0x44, 0x03, 0x65, 0x47, 0x77, 0x77, 0x8D, 0x04, 0x31, 0x66, 0x31, 0x55, 0x31, 0x44, 0x3F, 0x77, 0x9B, 0x1F, 0x00, 0x18, 0x51, 0x00, 0x88, 0x51, 0x00, 0x92, 0x8A, 0x20, 0x31, 0x11, 0x0E, 0x22, 0x28, 0x82, 0x22, 0x33, 0x32, 0x22, 0x34, 0x44, 0x32, 0x98, 0x22, 0x99, 0x98, 0x88, 0x89, 0x20, 0x00, 0x11, 0x30, 0x77, 0x01, 0x99, 0x88, 0x68, 0x04, 0x98, 0x11, 0x18, 0x77, 0x81, 0x34, 0x11, 0x9C, 0xFF, 0x01, 0x82, 0x87, 0x82, 0x80, 0x00, 0x61, 0x30, 0x55, 0x07, 0x21, 0x44, 0x44, 0x43, 0x21, 0x77, 0x77, 0x73, 0x8E, 0x04, 0x8F, 0xD4, 0x8B, 0x04, 0x38, 0x77, 0x00, 0x71, 0x83, 0xB8, 0x5E, 0x00, 0x71];

const decompressor = new NHL94Decompressor();

try {
    const result = decompressor.decompress(testDataBefore80, 0, false);
    console.log('Searching for pattern "11 77 77 11 11" in output...');
    
    const output = Array.from(result);
    const targetPattern = [0x11, 0x77, 0x77, 0x11, 0x11];
    
    // Search for the pattern
    for (let i = 0; i <= output.length - targetPattern.length; i++) {
        let matches = true;
        for (let j = 0; j < targetPattern.length; j++) {
            if (output[i + j] !== targetPattern[j]) {
                matches = false;
                break;
            }
        }
        if (matches) {
            console.log(`Found pattern at position ${i}, offset from end: ${output.length - i}`);
        }
    }
    
    // Also search for just "11 77 77"
    const pattern2 = [0x11, 0x77, 0x77];
    console.log('\nSearching for pattern "11 77 77" in output...');
    for (let i = 0; i <= output.length - pattern2.length; i++) {
        let matches = true;
        for (let j = 0; j < pattern2.length; j++) {
            if (output[i + j] !== pattern2[j]) {
                matches = false;
                break;
            }
        }
        if (matches) {
            console.log(`Found "11 77 77" at position ${i}, offset from end: ${output.length - i}`);
        }
    }
    
    // Search for "11 11"
    const pattern3 = [0x11, 0x11];
    console.log('\nSearching for pattern "11 11" in output...');
    for (let i = 0; i <= output.length - pattern3.length; i++) {
        let matches = true;
        for (let j = 0; j < pattern3.length; j++) {
            if (output[i + j] !== pattern3[j]) {
                matches = false;
                break;
            }
        }
        if (matches) {
            console.log(`Found "11 11" at position ${i}, offset from end: ${output.length - i}`);
        }
    }
    
    console.log('\nFull output as hex:');
    for (let i = 0; i < output.length; i += 16) {
        const chunk = output.slice(i, i + 16);
        const hex = chunk.map(b => b.toString(16).padStart(2, '0')).join(' ');
        const offset = i.toString().padStart(3, '0');
        console.log(`${offset}: ${hex}`);
    }
    
} catch(e) {
    console.error('Error:', e.message);
}
