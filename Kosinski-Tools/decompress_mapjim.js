// NHL94 .map.jim decompressor (Node.js)
// This script mirrors the 68k decompression logic as closely as possible.
//
// Usage: node decompress_mapjim.js <inputfile> <outputfile>

const fs = require('fs');

function readUInt16BE(buf, offset) {
    return (buf[offset] << 8) | buf[offset + 1];
}

function readUInt32BE(buf, offset) {
    return (buf[offset] << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3];
}

// Helper functions to write values to output array
function writeUInt8(output, value) {
    console.log('push 1');
    output.push(value & 0xFF);
}

function writeUInt16BE(output, value) {
    console.log('push 2-3');
    output.push((value >> 8) & 0xFF);   // High byte first
    output.push(value & 0xFF);          // Low byte second
}

function writeUInt32BE(output, value) {
    console.log('push 4-7');
    output.push((value >> 24) & 0xFF); // Highest byte first
    output.push((value >> 16) & 0xFF);
    output.push((value >> 8) & 0xFF);
    output.push(value & 0xFF);         // Lowest byte last
}

// Main decompression routine, mirrors 68k code structure
function decompressMapJim(inputBuffer) {
    // Header: 2x uint32 offsets, 1x uint16 (10 bytes)
    const paletteOffset = readUInt32BE(inputBuffer, 0);
    const mapOffset = readUInt32BE(inputBuffer, 4);
    const palSize = inputBuffer.readUInt8(8);
    const numTiles = inputBuffer.readUInt8(9);

    const newHeaderPaletteOffset = numTiles * 32 + 10;
    const newHeaderMapOffset = newHeaderPaletteOffset + palSize;

    // Copy the 10-byte header to the output first
    const output = [];
    // for (let i = 0; i < 10; i++) {
    //     output.push(inputBuffer[i]);
    // }
    // Write new header values
    writeUInt32BE(output, newHeaderPaletteOffset);
    writeUInt32BE(output, newHeaderMapOffset);
    writeUInt16BE(output, numTiles);
    let src = 10; // Start after header

    // Debug: print header info
    console.log('paletteOffset:', paletteOffset, 'mapOffset:', mapOffset, 'numTiles:', numTiles);

    // Decompress tile data (numTiles * 32 bytes per tile)
    let tilesDecompressed = 0;
    while (tilesDecompressed < numTiles) {
        console.log('numTiles',numTiles);
        let tileBytes = 0;
        while (tileBytes < 32) {
            if (src >= inputBuffer.length) {
                console.error('Reached EOF: tilesDecompressed', tilesDecompressed, 'tileBytes', tileBytes, 'src', src, 'inputBuffer', inputBuffer.length);
                return Buffer.from(output);
            }
            const ctrl = inputBuffer[src++];
            // Extract upper nibble (shift right 4 bits)
            const ctrlUpper = (ctrl >> 4) & 0xF;
            console.log(ctrlUpper, 'AA TEST!');
            // Extract lower nibble (mask with 0xF)
            const ctrlLower = ctrl & 0xF;            // console.log('Control byte:', ctrl.toString(16).padStart(2, '0'), 'upper:', ctrlUpper.toString(16), 'lower:', ctrlLower.toString(16));
            
            if (ctrlUpper == 0x0 || ctrlUpper == 0x1) { 
                const seq = [];
                const count = ctrlLower + 1;
                for (let i = 0; i < count; i++) {
                    seq.push(inputBuffer[src++]);
                }
                for (let r = 0; r < count; r++) {
                    for (let b = 0; b < seq.length; b++) {
                        console.log('push 9');
                        output.push(seq[b]);
                        tileBytes++;
                        if (tileBytes >= 32) break;
                    }
                    // if (tileBytes >= 32) break;
                }
                
            } else if (ctrlUpper == 0x2) { 
                debug(ctrl, tilesDecompressed, tileBytes, src);
                // Clear a byte in output at an offset
                // Lower 4 bits specify the offset where a byte is set to 0
                const count = ctrlLower + 1;
                for (let i = 0; i < count; i++) {
                    console.log('push 10');
                    output.push(0x00);
                    tileBytes++;
                    if (tileBytes >= 32) break;
                }
                
            } else if (ctrlUpper == 0x3 || ctrlUpper == 0x4 || 
                      ctrlUpper == 0x6 || ctrlUpper == 0x7) { 
                // Repeat a byte 2-17 times
                const count = (ctrlLower+1) + 2;
                const val = inputBuffer[src++];
                for (let i = 0; i < count; i++) {
                    console.log('push 11');
                    output.push(val);
                    tileBytes++;
                    if (tileBytes >= 32) break;
                }
                
            } else if (ctrlUpper == 0x8) { 
                // debug(ctrl, tilesDecompressed, tileBytes, src);
                // 8D 04 -> need to copy 4 bytes (0x4) starting from currentOffset-lower to zero
                if (ctrlLower > inputBuffer[src]) {
                    const numBytes = inputBuffer[src++];
                    const backOffset = -(ctrlLower + 1)+2; // Distance back to copy from
                    
                    console.log(`Copy ${numBytes} bytes from ${Math.abs(backOffset)} bytes ago`);
                    
                    for (let i = 0; i < numBytes; i++) {
                        const copyIndex = output.length + backOffset;
                        console.log(i, numBytes, copyIndex, output.length);
                        if (copyIndex >= 0 && copyIndex < output.length) {
                            console.log('push 12');
                            output.push(output[copyIndex]);
                        } else {
                            console.log('Invalid back reference');
                            console.log('push 13');
                            output.push(0x00); // Default if invalid reference
                        }
                        tileBytes++;
                        // if (tileBytes >= 32) break;
                    }
                } else { // ctrlLower <= inputBuffer[src])
                    // 8A 20 -> need to copy 12 bytes (0xB) from ending 48 bytes (0x56) ago, starting from 60 bytes (0x3C)
                    const numBytes = ctrlLower+3;
                    const backOffset = inputBuffer[src++] + 10;
                    const copiedValue = output.slice(backOffset, backOffset + numBytes);
                    console.log(`Copy ${numBytes} bytes from offset ${backOffset}`);
                    console.log(output.toString());
                    for (let i = 0; i < numBytes; i++) {
                        output.push(copiedValue[i]);
                        tileBytes++;
                        // if (tileBytes >= 32) break; Doing this breaks the decompression
                    }
                }
            } else if (ctrlUpper == 0x5) { 
                console.log('HEY!!');
                // debug(ctrl, tilesDecompressed, tileBytes, src);
                // Copy 2 + lower bytes
                const startCopyOffset = 2 + ctrlLower; // start copying from this offset
                const endCopyOffset = 0;
                const copiedValue = output.slice(output.length-startCopyOffset, output.length-endCopyOffset);
                const numBytes = startCopyOffset - endCopyOffset;
                console.log(numBytes, startCopyOffset, endCopyOffset, numBytes, copiedValue);
                
                for (let i = 0; i < numBytes; i++) {
                    output.push(copiedValue[i]);
                    tileBytes++;
                    // if (tileBytes >= 32) break; Doing this breaks the decompression
                }
            } else if (ctrlUpper == 0x9) { 
                // console.log('HEY!!');
                // debug(ctrl, tilesDecompressed, tileBytes, src);
                // Copy 1-256 bytes from a previous position (back-reference)
                const startCopyOffset = inputBuffer[src++] + 1; // start copying from this offset
                const endCopyOffset = (0xF - (ctrlLower)) + 3;
                // const backOffset = -(offsetBits); // Negated offset
                const copiedValue = output.slice(output.length-startCopyOffset, output.length-endCopyOffset);
                const numBytes = startCopyOffset - endCopyOffset;
                console.log(numBytes, startCopyOffset, endCopyOffset, numBytes, copiedValue);
                
                for (let i = 0; i < numBytes; i++) {
                    output.push(copiedValue[i]);
                    tileBytes++;
                    // if (tileBytes >= 32) break; Doing this breaks the decompression
                }
            } else if (ctrlUpper == 0xA) { 
                debug(ctrl, tilesDecompressed, tileBytes, src);
                // Repeat a byte for a larger count (2-33)
                // Lower 4 bits contribute to a 5-bit count with the next byte
                const nextByte = inputBuffer[src++];
                const count = ((ctrlLower << 1) | ((nextByte >> 7) & 1)) + 2; // 5-bit count + 2
                const val = inputBuffer[src++];
                for (let i = 0; i < count; i++) {
                    console.log('push 16');
                    output.push(val);
                    tileBytes++;
                    if (tileBytes >= 32) break;
                }
                
            } else if (ctrlUpper == 0xB || ctrlUpper == 0xE) { 
                debug(ctrl, tilesDecompressed, tileBytes, src);
                // Repeat a byte for a large count (2-65)
                // Lower 4 bits contribute to a 6-bit count with the next byte
                const nextByte = inputBuffer[src++];
                const count = ((ctrlLower << 2) | ((nextByte >> 6) & 3)) + 2; // 6-bit count + 2
                const val = inputBuffer[src++];
                for (let i = 0; i < count; i++) {
                    console.log('push 17');
                    output.push(val);
                    tileBytes++;
                    if (tileBytes >= 32) break;
                }
                
            } else if (ctrlUpper == 0xC || ctrlUpper == 0xD) { 
                debug(ctrl, tilesDecompressed, tileBytes, src);
                // Copy 1-4 bytes from a previous position (back-reference)
                const numBytes = (ctrlLower & 0x3) + 1; // Lower 2 bits + 1
                const offsetBits = (ctrlLower >> 2) & 0x7; // Bits 4-2
                const backOffset = -(offsetBits + 1); // Negated offset
                
                for (let i = 0; i < numBytes; i++) {
                    const copyIndex = output.length + backOffset;
                    if (copyIndex >= 0 && copyIndex < output.length) {
                        console.log('push 18');
                        output.push(output[copyIndex]);
                    } else {
                        console.log('what is this 3');
                        console.log('push 19');
                        output.push(0x00); // Default if invalid reference
                    }
                    tileBytes++;
                    if (tileBytes >= 32) break;
                }
                
            } else if (ctrlUpper == 0xF) { 
                debug(ctrl, tilesDecompressed, tileBytes, src);
                // Special case or end of decompression
                // For now, treat as end of tile or skip
                console.log('End marker or special case encountered');
                break;
                
            } else {
                // Unknown command - treat as literal
                throw new Error(`Unknown control byte: 0x${ctrl.toString(16).padStart(2, '0')} at tile ${tilesDecompressed}, byte ${tileBytes}`);
                console.warn(`Unknown control byte: 0x${ctrl.toString(16).padStart(2, '0')} at tile ${tilesDecompressed}, byte ${tileBytes}`);
                console.log('push 20');
                output.push(ctrl);
                tileBytes++;
            }
        }
        tilesDecompressed++;
    }

    return Buffer.from(output);
}

function debug(ctrl, tilesDecompressed, tileBytes, src) {
        // throw new Error(`Unknown control byte: 0x${ctrl.toString(16).padStart(2, '0')} at tile ${tilesDecompressed}, byte ${tileBytes}, offset ${src-7}`);
    return;
}

// File I/O
if (process.argv.length !== 4) {
    console.error('Usage: node decompress_mapjim.js <inputfile> <outputfile>');
    process.exit(1);
}

const inputFile = process.argv[2];
const outputFile = process.argv[3];

fs.readFile(inputFile, (err, data) => {
    if (err) {
        console.error('Error reading file:', err);
        return;
    }
    const decompressed = decompressMapJim(data);
    fs.writeFile(outputFile, decompressed, (err) => {
        if (err) {
            console.error('Error writing file:', err);
        } else {
            console.log('Decompression complete:', outputFile);
        }
    });
});
