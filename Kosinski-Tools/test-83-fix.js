// Test script to verify the 0x83 command fix
const fs = require('fs');
const path = require('path');

// Create test data: sequence ending with 0x83 B8 5E
const testData1 = Buffer.from([0x83, 0xB8]); // Should terminate after reading B8
const testData2 = Buffer.from([0x83, 0xB8, 0x5E]); // Should terminate after reading B8, leaving 5E for next command

console.log('Testing 0x83 command fix...');

function testDecompressor(data, description) {
    console.log(`\n${description}:`);
    console.log('Input:', Array.from(data).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
    
    // Write test data to temp file
    const tempFile = path.join(__dirname, 'temp_test.bin');
    fs.writeFileSync(tempFile, data);
    
    // Run decompressor
    try {
        const { exec } = require('child_process');
        exec(`node nhl94-decompressor.js "${tempFile}" output_test.bin --verbose`, (error, stdout, stderr) => {
            if (error) {
                console.log('Error:', error.message);
            } else {
                console.log('Output:', stdout);
            }
            
            // Clean up
            try {
                fs.unlinkSync(tempFile);
                fs.unlinkSync(path.join(__dirname, 'output_test.bin'));
            } catch (e) {}
        });
    } catch (e) {
        console.log('Error running test:', e);
    }
}

// Test both cases
testDecompressor(testData1, 'Test 1: 0x83 B8 (should terminate after B8)');
setTimeout(() => {
    testDecompressor(testData2, 'Test 2: 0x83 B8 5E (should terminate after B8, not consume 5E)');
}, 1000);
