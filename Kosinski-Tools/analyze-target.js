// Let me test the theory that 80 8F is a two-byte command
// Expected output should be: 11 77 77 11 11 71

const { NHL94Decompressor } = require('./nhl94-decompressor.js');

// Test data up to just before the 80 command
const testDataBefore80 = [0x31, 0x66, 0x00, 0x65, 0x30, 0x55, 0x00, 0x65, 0x30, 0x44, 0x03, 0x65, 0x47, 0x77, 0x77, 0x8D, 0x04, 0x31, 0x66, 0x31, 0x55, 0x31, 0x44, 0x3F, 0x77, 0x9B, 0x1F, 0x00, 0x18, 0x51, 0x00, 0x88, 0x51, 0x00, 0x92, 0x8A, 0x20, 0x31, 0x11, 0x0E, 0x22, 0x28, 0x82, 0x22, 0x33, 0x32, 0x22, 0x34, 0x44, 0x32, 0x98, 0x22, 0x99, 0x98, 0x88, 0x89, 0x20, 0x00, 0x11, 0x30, 0x77, 0x01, 0x99, 0x88, 0x68, 0x04, 0x98, 0x11, 0x18, 0x77, 0x81, 0x34, 0x11, 0x9C, 0xFF, 0x01, 0x82, 0x87, 0x82, 0x80, 0x00, 0x61, 0x30, 0x55, 0x07, 0x21, 0x44, 0x44, 0x43, 0x21, 0x77, 0x77, 0x73, 0x8E, 0x04, 0x8F, 0xD4, 0x8B, 0x04, 0x38, 0x77, 0x00, 0x71, 0x83, 0xB8, 0x5E, 0x00, 0x71];

const decompressor = new NHL94Decompressor();

try {
    const result = decompressor.decompress(testDataBefore80, 0, false);
    const output = Array.from(result);
    
    console.log('Analyzing what combinations could produce: 11 77 77 11 11 71');
    console.log('Current output length:', output.length);
    console.log('Current output ends with:', output.slice(-10).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    // If 80 8F produces the first few bytes, let's see what pattern could work
    // Breaking down the target: 11 77 77 11 11 71
    
    // Search for just "11"
    console.log('\\nLooking for single 0x11 bytes near the end:');
    for (let i = output.length - 50; i < output.length; i++) {
        if (i >= 0 && output[i] === 0x11) {
            console.log(`Found 0x11 at position ${i}, offset from end: ${output.length - i}`);
        }
    }
    
    // Search for "77 77"  
    console.log('\\nLooking for "77 77" near the end:');
    for (let i = output.length - 50; i < output.length - 1; i++) {
        if (i >= 0 && output[i] === 0x77 && output[i+1] === 0x77) {
            console.log(`Found "77 77" at position ${i}, offset from end: ${output.length - i}`);
        }
    }
    
    // Search for "71"
    console.log('\\nLooking for 0x71 near the end:');
    for (let i = output.length - 20; i < output.length; i++) {
        if (i >= 0 && output[i] === 0x71) {
            console.log(`Found 0x71 at position ${i}, offset from end: ${output.length - i}`);
        }
    }
    
} catch(e) {
    console.error('Error:', e.message);
}
