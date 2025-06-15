import fs from 'fs';

class TileDecompressor {
    constructor() {
        this.output = Buffer.alloc(0);
        this.position = 0;
    }

    reset() {
        this.output = Buffer.alloc(0);
        this.position = 0;
    }

    setOutput(buffer) {
        this.output = Buffer.from(buffer);
        this.position = this.output.length;
    }

    getOutput() {
        return this.output;
    }

    writeBytes(bytes) {
        this.output = Buffer.concat([this.output, Buffer.from(bytes)]);
        this.position += bytes.length;
    }

    copyBackReference(offset, count) {
        const result = [];
        for (let i = 0; i < count; i++) {
            const srcPos = this.position - offset + i;
            if (srcPos < 0 || srcPos >= this.output.length) {
                throw new Error(`Back reference out of bounds: pos=${this.position}, offset=${offset}, count=${count}, srcPos=${srcPos}`);
            }
            result.push(this.output[srcPos]);
        }
        this.writeBytes(result);
        return result;
    }

    repeatPattern(offset, count) {
        // First, get the source bytes without writing to output
        const sourceBytes = [];
        // console.log('AA4', count);
        for (let i = 0; i < offset; i++) {
            const srcPos = this.position - offset + i;
            if (srcPos < 0 || srcPos >= this.output.length) {
                throw new Error(`Back reference out of bounds: pos=${this.position}, offset=${offset}, count=${count}, srcPos=${srcPos}`);
            }
            sourceBytes.push(this.output[srcPos]);
        }
        
        // Now repeat the pattern to get the full sequence
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(sourceBytes[i % sourceBytes.length]);
        }
        
        // Write the full sequence to output (only once)
        this.writeBytes(result);
        return result;
    }

    processCommand(commandByte, additionalBytes = []) {
        const cmd = commandByte >> 4;
        const param = commandByte & 0xF;
        
        switch (cmd) {
            case 0x0: // Literal copy
                const literalCount = param + 1;
                if (additionalBytes.length < literalCount) {
                    throw new Error(`Not enough bytes for literal copy: need ${literalCount}, got ${additionalBytes.length}`);
                }
                const literalBytes = additionalBytes.slice(0, literalCount);
                this.writeBytes(literalBytes);
                return {
                    command: 'literal',
                    count: literalCount,
                    bytes: literalBytes,
                    consumed: literalCount
                };

            case 0x3: // RLE
                const rleCount = param + 3;
                if (additionalBytes.length < 1) {
                    throw new Error('Not enough bytes for RLE command');
                }
                const rleByte = additionalBytes[0];
                const rleBytes = new Array(rleCount).fill(rleByte);
                this.writeBytes(rleBytes);
                return {
                    command: 'rle',
                    count: rleCount,
                    byte: rleByte,
                    bytes: rleBytes,
                    consumed: 1
                };

            case 0x5: // Short back reference
                // const shortOffset = ((param & 0xC) >> 2) + 1;
                // const shortCount = (param & 0x3) + 1;
                const shortOffset = param + 2;
                const shortCount = param + 2;
                // console.log('AA SHORT', param, shortOffset, shortCount);
                const shortBytes = this.copyBackReference(shortOffset, shortCount);
                return {
                    command: 'short_back_ref',
                    offset: shortOffset,
                    count: shortCount,
                    bytes: shortBytes,
                    consumed: 0
                };

            case 0x8: // Back reference Pattern with byte offset
                const backRefCount = param + 3;
                if (additionalBytes.length < 1) {
                    throw new Error('Not enough bytes for back reference command');
                }
                const backRefOffset = additionalBytes[0];
                // const backRefBytes = this.copyBackReference(backRefOffset, backRefOffset); // Grab last X bytes
                const backRefSequence = this.repeatPattern(backRefOffset, backRefCount);
                // console.log('AA TEST', backRefSequence);
                return {
                    command: 'back_ref_8',
                    offset: backRefOffset,
                    count: backRefCount,
                    bytes: backRefSequence,
                    consumed: 1
                };
            case 0x9: // Back reference with byte offset (alternative)
                const backRefCountAlt = (param*2) + 1;
                if (additionalBytes.length < 1) {
                    throw new Error('Not enough bytes for back reference command');
                }
                const backRefOffsetAlt = additionalBytes[0]+1;
                const backRefBytesAlt = this.copyBackReference(backRefOffsetAlt, backRefCountAlt);
                return {
                    command: 'back_ref_9',
                    offset: backRefOffsetAlt,
                    count: backRefCountAlt,
                    bytes: backRefBytesAlt,
                    consumed: 1
                };

            case 0xC: // Fixed offset back reference
                const fixedCount = param + 1;
                const fixedOffset = 32; // Fixed 32-byte offset for tile patterns
                const fixedBytes = this.copyBackReference(fixedOffset, fixedCount);
                return {
                    command: 'fixed_back_ref',
                    offset: fixedOffset,
                    count: fixedCount,
                    bytes: fixedBytes,
                    consumed: 0
                };

            default:
                throw new Error(`Unknown command: 0x${cmd.toString(16)}`);
        }
    }
}

function decompressJZipFile(inputPath, outputPath) {
    const input = fs.readFileSync(inputPath);
    
    // Read header
    const paletteOffset = input.readUInt32BE(0);
    const mapOffset = input.readUInt32BE(4);
    const paletteSize = input.readUInt8(8);
    const numTiles = input.readUInt8(9);
    
    console.log(`Palette offset: 0x${paletteOffset.toString(16)}`);
    console.log(`Map offset: 0x${mapOffset.toString(16)}`);
    console.log(`Palette size: ${paletteSize}`);
    console.log(`Number of tiles: ${numTiles}`);
    
    // Find end of compressed data (before palette)
    const compressedDataStart = 10;
    const compressedDataEnd = paletteOffset;
    
    // Check for end marker
    let actualEnd = compressedDataEnd;
    if (input.readUInt32BE(compressedDataEnd - 4) === 0xFFFFFFFF) {
        actualEnd = compressedDataEnd - 4;
        console.log('Found end marker, adjusting compressed data end');
    }
    
    // Decompress tile data
    const decompressor = new TileDecompressor();
    let pos = compressedDataStart;
    
    while (pos < actualEnd) {
        const commandByte = input.readUInt8(pos);
        pos++;
        
        // Determine how many additional bytes this command needs
        const cmd = commandByte >> 4;
        let additionalBytesNeeded = 0;
        
        switch (cmd) {
            case 0x0: // Literal copy
                additionalBytesNeeded = (commandByte & 0xF) + 1;
                break;
            case 0x3: // RLE
            case 0x8: // Back reference
            case 0x9: // Back reference alternative
                additionalBytesNeeded = 1;
                break;
            case 0x5: // Short back reference
            case 0xC: // Fixed back reference
                additionalBytesNeeded = 0;
                break;
            default:
                throw new Error(`Unknown command: 0x${cmd.toString(16)}`);
        }
        
        const additionalBytes = [];
        for (let i = 0; i < additionalBytesNeeded; i++) {
            if (pos >= actualEnd) {
                throw new Error('Unexpected end of compressed data');
            }
            additionalBytes.push(input.readUInt8(pos));
            pos++;
        }
        
        try {
            const result = decompressor.processCommand(commandByte, additionalBytes);
            console.log(`Command 0x${commandByte.toString(16).padStart(2, '0')}: ${result.command}, count: ${result.count}, consumed: ${result.consumed}`);
        } catch (error) {
            console.error(`Error processing command 0x${commandByte.toString(16)} at position ${pos - 1}:`, error.message);
            break;
        }
    }
    
    const decompressedTiles = decompressor.getOutput();
    console.log(`Decompressed ${decompressedTiles.length} bytes of tile data (expected: ${numTiles * 32})`);
    
    // Create output file
    const output = Buffer.alloc(8 + decompressedTiles.length + paletteSize + (input.length - mapOffset));
    let outputPos = 0;
    
    // Write new header
    const newPaletteOffset = 8 + 2 + decompressedTiles.length; // 8 byte header + 2 byte tile count + tiles
    const newMapOffset = newPaletteOffset + paletteSize;
    
    output.writeUInt32BE(newPaletteOffset, 0);
    output.writeUInt32BE(newMapOffset, 4);
    outputPos += 8;
    
    // Write number of tiles (16-bit)
    output.writeUInt16BE(numTiles, outputPos);
    outputPos += 2;
    
    // Write decompressed tile data
    decompressedTiles.copy(output, outputPos);
    outputPos += decompressedTiles.length;
    
    // Copy palette data
    input.copy(output, outputPos, paletteOffset, paletteOffset + paletteSize);
    outputPos += paletteSize;
    
    // Copy map data (excluding any trailing FF FF FF FF)
    const mapDataStart = mapOffset;
    let mapDataEnd = input.length;
    
    // Check if there's an end marker at the very end
    if (input.readUInt32BE(input.length - 4) === 0xFFFFFFFF) {
        mapDataEnd = input.length - 4;
    }
    
    input.copy(output, outputPos, mapDataStart, mapDataEnd);
    outputPos += (mapDataEnd - mapDataStart);
    
    // Trim output to actual size
    const finalOutput = output.slice(0, outputPos);
    fs.writeFileSync(outputPath, finalOutput);
    
    console.log(`Decompressed file written to ${outputPath}`);
    console.log(`Final size: ${finalOutput.length} bytes`);
}

export { TileDecompressor, decompressJZipFile };

// If run directly (handle cross-platform path differences)
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename || 
                   path.resolve(process.argv[1]) === path.resolve(__filename);

if (isMainModule) {
    if (process.argv.length < 4) {
        console.log('Usage: node uncompress-jzip.js <input.jzip> <output.jim>');
        process.exit(1);
    }
    
    const inputPath = process.argv[2];
    const outputPath = process.argv[3];
    
    try {
        decompressJZipFile(inputPath, outputPath);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}