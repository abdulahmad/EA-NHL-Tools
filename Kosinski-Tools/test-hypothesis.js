const { NHL94Decompressor } = require('./nhl94-decompressor.js');

// Test data up to just before the 80 command
const testDataBefore80 = [0x31, 0x66, 0x00, 0x65, 0x30, 0x55, 0x00, 0x65, 0x30, 0x44, 0x03, 0x65, 0x47, 0x77, 0x77, 0x8D, 0x04, 0x31, 0x66, 0x31, 0x55, 0x31, 0x44, 0x3F, 0x77, 0x9B, 0x1F, 0x00, 0x18, 0x51, 0x00, 0x88, 0x51, 0x00, 0x92, 0x8A, 0x20, 0x31, 0x11, 0x0E, 0x22, 0x28, 0x82, 0x22, 0x33, 0x32, 0x22, 0x34, 0x44, 0x32, 0x98, 0x22, 0x99, 0x98, 0x88, 0x89, 0x20, 0x00, 0x11, 0x30, 0x77, 0x01, 0x99, 0x88, 0x68, 0x04, 0x98, 0x11, 0x18, 0x77, 0x81, 0x34, 0x11, 0x9C, 0xFF, 0x01, 0x82, 0x87, 0x82, 0x80, 0x00, 0x61, 0x30, 0x55, 0x07, 0x21, 0x44, 0x44, 0x43, 0x21, 0x77, 0x77, 0x73, 0x8E, 0x04, 0x8F, 0xD4, 0x8B, 0x04, 0x38, 0x77, 0x00, 0x71, 0x83, 0xB8, 0x5E, 0x00, 0x71];

const decompressor = new NHL94Decompressor();

try {
    const result = decompressor.decompress(testDataBefore80, 0, false);
    const output = Array.from(result);
    
    console.log('Testing hypothesis: 80 8F 00 means copy 6 bytes from offset -143');
    console.log('Output length:', output.length);
    
    const offset = 143;
    const count = 6;
    const startPos = output.length - offset;
    
    console.log(`Copying ${count} bytes from position ${startPos} (offset -${offset})`);
    
    if (startPos >= 0 && startPos + count <= output.length) {
        const copied = output.slice(startPos, startPos + count);
        console.log('Copied bytes:', copied.map(b => b.toString(16).padStart(2, '0')).join(' '));
        
        const expected = [0x11, 0x77, 0x77, 0x11, 0x11, 0x71];
        console.log('Expected:    ', expected.map(b => b.toString(16).padStart(2, '0')).join(' '));
        console.log('Match:', JSON.stringify(copied) === JSON.stringify(expected));
        
        // Let's also check what's at position 140 specifically
        console.log('\\nAt position 140 (where we found "11 77 77"):');
        const at140 = output.slice(140, 146);
        console.log('Bytes 140-145:', at140.map(b => b.toString(16).padStart(2, '0')).join(' '));
        
    } else {
        console.log('Invalid range');
    }
    
} catch(e) {
    console.error('Error:', e.message);
}
