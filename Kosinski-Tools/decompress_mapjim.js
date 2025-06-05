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
    
    let src = 10; // Start after header
    const output = [];

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
            if (ctrl === undefined) throw new Error('Unexpected EOF');
            // Debug: print control byte and state
            console.log('ctrl:', ctrl.toString(16), 'src:', src, 'tileBytes:', tileBytes, 'tilesDecompressed:', tilesDecompressed);
            if (ctrl <= 0x3F) {
                for (let i = 0; i < ctrl + 1; i++) {
                    if (src >= inputBuffer.length) {
                        console.error('EOF during literal copy', {tilesDecompressed, tileBytes, src, i, ctrl});
                        return Buffer.from(output);
                    }
                    output.push(inputBuffer[src++]);
                    tileBytes++;
                }
            } else if (ctrl <= 0x7F) {
                const count = (ctrl & 0x3F) + 1;
                if (src >= inputBuffer.length) {
                    console.error('EOF during repeat', {tilesDecompressed, tileBytes, src, count, ctrl});
                    return Buffer.from(output);
                }
                const val = inputBuffer[src++];
                for (let i = 0; i < count; i++) {
                    output.push(val);
                    tileBytes++;
                }
            } else if (ctrl <= 0xBF) {
                // Backreference (LZ-style)
                // Not fully understood, placeholder: treat as literal for now
                if (src >= inputBuffer.length) {
                    console.error('EOF during backreference placeholder', {tilesDecompressed, tileBytes, src, ctrl});
                    return Buffer.from(output);
                }
                output.push(inputBuffer[src++]);
                tileBytes++;
            } else {
                // Reserved/unknown control codes
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
