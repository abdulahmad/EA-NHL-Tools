// Let's analyze what should happen step by step
// Input sequence ending with: ...71 80 8F 00 11 CC
// Expected additional output: 11 77 77 11 11 71

// Current output before 80 command should end with: ...77 77 71
// Let me check this first

const { NHL94Decompressor } = require('./nhl94-decompressor.js');

// Test data up to just before the 80 command
const testDataBefore80 = [0x31, 0x66, 0x00, 0x65, 0x30, 0x55, 0x00, 0x65, 0x30, 0x44, 0x03, 0x65, 0x47, 0x77, 0x77, 0x8D, 0x04, 0x31, 0x66, 0x31, 0x55, 0x31, 0x44, 0x3F, 0x77, 0x9B, 0x1F, 0x00, 0x18, 0x51, 0x00, 0x88, 0x51, 0x00, 0x92, 0x8A, 0x20, 0x31, 0x11, 0x0E, 0x22, 0x28, 0x82, 0x22, 0x33, 0x32, 0x22, 0x34, 0x44, 0x32, 0x98, 0x22, 0x99, 0x98, 0x88, 0x89, 0x20, 0x00, 0x11, 0x30, 0x77, 0x01, 0x99, 0x88, 0x68, 0x04, 0x98, 0x11, 0x18, 0x77, 0x81, 0x34, 0x11, 0x9C, 0xFF, 0x01, 0x82, 0x87, 0x82, 0x80, 0x00, 0x61, 0x30, 0x55, 0x07, 0x21, 0x44, 0x44, 0x43, 0x21, 0x77, 0x77, 0x73, 0x8E, 0x04, 0x8F, 0xD4, 0x8B, 0x04, 0x38, 0x77, 0x00, 0x71, 0x83, 0xB8, 0x5E, 0x00, 0x71];

const decompressor = new NHL94Decompressor();

try {
    const result = decompressor.decompress(testDataBefore80, 0, false);
    console.log('Result length before 80 command:', result.length);
    console.log('Last 20 bytes before 80:', Array.from(result.slice(-20)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    // The expected full sequence output should end with: ...77 77 71 11 77 77 11 11 71
    // So before the 80 command it should end with: ...77 77 71
    console.log('Should end with 77 77 71');
    const expectedEnd = [0x77, 0x77, 0x71];
    const actualEnd = Array.from(result.slice(-3));
    console.log('Expected:', expectedEnd.map(b => b.toString(16).padStart(2, '0')).join(' '));
    console.log('Actual:  ', actualEnd.map(b => b.toString(16).padStart(2, '0')).join(' '));
    
} catch(e) {
    console.error('Error:', e.message);
}
