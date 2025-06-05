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

// Main decompression routine, mirrors 68k code structure
function decompressMapJim(inputBuffer) {
    // Header: 2x uint32 offsets, 1x uint16 (10 bytes)
    const paletteOffset = readUInt32BE(inputBuffer, 0);
    const mapOffset = readUInt32BE(inputBuffer, 4);
    const numTiles = readUInt16BE(inputBuffer, 8);
    
    // Copy the 10-byte header to the output first
    const output = [];
    for (let i = 0; i < 10; i++) {
        output.push(inputBuffer[i]);
    }
    let src = 10; // Start after header

    // Debug: print header info
    console.log('paletteOffset:', paletteOffset, 'mapOffset:', mapOffset, 'numTiles:', numTiles);

    // Decompress tile data (numTiles * 32 bytes per tile)
    let tilesDecompressed = 0;
    while (tilesDecompressed < numTiles) {
        let tileBytes = 0;
        while (tileBytes < 32) {
            if (src >= inputBuffer.length) {
                console.error('Reached EOF: tilesDecompressed', tilesDecompressed, 'tileBytes', tileBytes, 'src', src);
                return Buffer.from(output);
            }
            const ctrl = inputBuffer[src++];
            // Extract upper nibble (shift right 4 bits)
            const ctrlUpper = (ctrl >> 4) & 0xF;
            
            // Extract lower nibble (mask with 0xF)
            const ctrlLower = ctrl & 0xF;
            console.log('aa test',ctrl, ctrlUpper, ctrlLower);
            // throw new Error('stop');
            if (ctrlUpper == 0x0) { // Repeat next byte ctrl+1 times)
                const seq = [];
                const count = ctrlLower + 1;
                for (let i = 0; i < count; i++) {
                    seq.push(inputBuffer[src++]);
                }
                for (let r = 0; r < count; r++) {
                    for (let b = 0; b < seq.length; b++) {
                        output.push(seq[b]);
                        tileBytes++;
                        if (tileBytes >= 32) break;
                    }
                    if (tileBytes >= 32) break;
                }
            } else if (ctrlUpper == 0x3) { // repeat next byte (ctrl+1) + 2 times
                const count = (ctrlLower+1) + 2;
                const val = inputBuffer[src++];
                for (let i = 0; i < count; i++) {
                    output.push(val);
                    tileBytes++;
                }
            }
            // else if (ctrl === 0x00) {
            //     // Repeat next byte once
            //     const val = inputBuffer[src++];
            //     output.push(val);
            //     tileBytes++;
            // } 
            // else if (ctrl === 0x03) {
            //     // Repeat the next 4 bytes as a sequence, 4 times
            //     const seq = [];
            //     for (let i = 0; i < 4; i++) {
            //         seq.push(inputBuffer[src++]);
            //     }
            //     for (let r = 0; r < 4; r++) {
            //         for (let b = 0; b < seq.length; b++) {
            //             output.push(seq[b]);
            //             tileBytes++;
            //             if (tileBytes >= 32) break;
            //         }
            //         if (tileBytes >= 32) break;
            //     }
            // } 
            else if (ctrl === 0x8D) {
                // Backreference: copy the last 'count' bytes from output, but do not overflow the tile
                const count = inputBuffer[src++];
                const start = output.length - count;
                for (let i = 0; i < count && tileBytes < 32; i++) {
                    output.push(output[start + i]);
                    tileBytes++;
                }
            } else {
                // throw new Error(`Unknown control byte: 0x${ctrl.toString(16).padStart(2, '0')} at tile ${tilesDecompressed}, byte ${tileBytes}`);
                // Treat as literal
                output.push(ctrl);
                tileBytes++;
            }
        }
        tilesDecompressed++;
    }

    return Buffer.from(output);
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
