// Let's try to understand the 0x60-0x6F command implementation
// Based on the pattern, let's implement a corrected version

class NHL94DecompressorTest {
    constructor() {
        this.outputData = [];
    }

    writeOutputByte(byte) {
        this.outputData.push(byte & 0xFF);
    }

    // Test implementation of 0x60-0x6F commands
    cmd_extended_60_impl_v1(commandByte, verbose = false) {
        // Version 1: Low nibble is offset directly, count is always 2
        const offset = commandByte & 0x0F; // 8 for 0x68
        const count = 2;
        
        if (verbose) console.log(`  Extended 60 v1: copy ${count} bytes from offset -${offset}`);
        
        const sourcePos = this.outputData.length - offset;
        for (let i = 0; i < count; i++) {
            if (sourcePos + i >= 0 && sourcePos + i < this.outputData.length) {
                this.writeOutputByte(this.outputData[sourcePos + i]);
            } else {
                this.writeOutputByte(0);
            }
        }
    }

    cmd_extended_60_impl_v2(commandByte, verbose = false) {
        // Version 2: Low nibble minus 2 is offset, count is 2
        const offset = (commandByte & 0x0F) - 2; // 6 for 0x68
        const count = 2;
        
        if (verbose) console.log(`  Extended 60 v2: copy ${count} bytes from offset -${offset}`);
        
        const sourcePos = this.outputData.length - offset;
        for (let i = 0; i < count; i++) {
            if (sourcePos + i >= 0 && sourcePos + i < this.outputData.length) {
                this.writeOutputByte(this.outputData[sourcePos + i]);
            } else {
                this.writeOutputByte(0);
            }
        }
    }

    cmd_extended_60_impl_v3(commandByte, verbose = false) {
        // Version 3: Count is low nibble, offset is fixed or calculated differently
        const count = (commandByte & 0x0F); // 8 for 0x68 - too many
        const offset = 6; // Hardcoded for testing
        
        if (verbose) console.log(`  Extended 60 v3: copy ${count} bytes from offset -${offset}`);
        
        const sourcePos = this.outputData.length - offset;
        for (let i = 0; i < count; i++) {
            if (sourcePos + i >= 0 && sourcePos + i < this.outputData.length) {
                this.writeOutputByte(this.outputData[sourcePos + i]);
            } else {
                this.writeOutputByte(0);
            }
        }
    }
}

// Test with the actual output buffer
const outputBuffer = [0x98, 0x88, 0x66, 0x66, 0x66, 0x66, 0x55, 0x55, 0x55, 0x55, 0x44, 0x44, 0x44, 0x44, 0x11, 0x77, 0x77, 0x77, 0x99, 0x88];

console.log('Testing different implementations of 0x68 command:');
console.log('Input buffer ends with:', outputBuffer.slice(-6).map(b => b.toString(16).padStart(2, '0')).join(' '));
console.log('Expected output: 11 77');
console.log();

// Test version 1
const test1 = new NHL94DecompressorTest();
test1.outputData = [...outputBuffer];
test1.cmd_extended_60_impl_v1(0x68, true);
console.log('Version 1 result:', test1.outputData.slice(-4).map(b => b.toString(16).padStart(2, '0')).join(' '));

// Test version 2  
const test2 = new NHL94DecompressorTest();
test2.outputData = [...outputBuffer];
test2.cmd_extended_60_impl_v2(0x68, true);
console.log('Version 2 result:', test2.outputData.slice(-4).map(b => b.toString(16).padStart(2, '0')).join(' '));

// Test version 3
const test3 = new NHL94DecompressorTest();
test3.outputData = [...outputBuffer];
test3.cmd_extended_60_impl_v3(0x68, true);
console.log('Version 3 result:', test3.outputData.slice(-10).map(b => b.toString(16).padStart(2, '0')).join(' '));
