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
    }    copyBackReference(offset, count) {
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
    }    repeatPattern(offset, count) {
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
                const backRefCountAlt = (param*2) + 1 + 2; // added additional 2 bytes-- question if this should be in or out of bracket
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
                };            default:
                throw new Error(`Unknown command: 0x${cmd.toString(16)}`);
        }
    }
}

function decompressJZipFile(inputPath, outputPath) {
    const input = fs.readFileSync(inputPath);
    
    console.log(`Input file size: ${input.length} bytes`);
    
    // Check if we have enough bytes for the header
    if (input.length < 10) {
        console.error(`File too small: ${input.length} bytes, need at least 10 bytes for header`);
        process.exit(1);
    }
    
    // Read header
    const paletteOffset = input.readUInt32BE(0);
    const mapOffset = input.readUInt32BE(4);
    const paletteSize = input.readUInt8(8);
    const numTiles = input.readUInt8(9);
    
    console.log(`Palette offset: 0x${paletteOffset.toString(16)} (${paletteOffset})`);
    console.log(`Map offset: 0x${mapOffset.toString(16)} (${mapOffset})`);
    console.log(`Palette size: ${paletteSize}`);
    console.log(`Number of tiles: ${numTiles}`);
    
    // Check if the offsets are reasonable given the file size
    if (paletteOffset >= input.length) {
        console.warn(`WARNING: Palette offset ${paletteOffset} is beyond file size ${input.length}`);
        console.warn('File appears to be truncated - will decompress what we can');
    }
    
    if (mapOffset >= input.length) {
        console.warn(`WARNING: Map offset ${mapOffset} is beyond file size ${input.length}`);
        console.warn('File appears to be truncated - will decompress what we can');
    }
    
    // Find end of compressed data (before palette, or end of file if truncated)
    const compressedDataStart = 10;
    const compressedDataEnd = Math.min(paletteOffset, input.length);
    
    console.log(`Compressed data range: ${compressedDataStart} to ${compressedDataEnd} (${compressedDataEnd - compressedDataStart} bytes)`);
    
    // Check for end marker (only if we have enough data)
    let actualEnd = compressedDataEnd;
    if (compressedDataEnd >= 4 && input.readUInt32BE(compressedDataEnd - 4) === 0xFFFFFFFF) {
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
                console.error(`Unknown command: 0x${cmd.toString(16)} at position ${pos - 1}`);
                console.log('Stopping decompression and saving partial result...');
                break;
        }
        
        // If we hit an unknown command, break out of the main loop
        if (cmd !== 0x0 && cmd !== 0x3 && cmd !== 0x8 && cmd !== 0x9 && cmd !== 0x5 && cmd !== 0xC) {
            break;
        }
          const additionalBytes = [];
        for (let i = 0; i < additionalBytesNeeded; i++) {
            if (pos >= actualEnd) {
                console.warn(`WARNING: Unexpected end of compressed data at position ${pos}`);
                console.warn(`Need ${additionalBytesNeeded} additional bytes, but only got ${i}`);
                console.warn('Stopping decompression and saving partial result...');
                // Fill remaining bytes with zeros
                for (let j = i; j < additionalBytesNeeded; j++) {
                    additionalBytes.push(0);
                }
                break;
            }
            additionalBytes.push(input.readUInt8(pos));
            pos++;
        }          try {
            const result = decompressor.processCommand(commandByte, additionalBytes);
            console.log(`Command 0x${commandByte.toString(16).padStart(2, '0')}: ${result.command}, count: ${result.count}, consumed: ${result.consumed}`);
        } catch (error) {
            console.error(`Error processing command 0x${commandByte.toString(16)} at position ${pos - 1}:`, error.message);
            console.log('Stopping decompression and saving partial result...');
            break;
        }
    }
      const decompressedTiles = decompressor.getOutput();
    console.log(`Decompressed ${decompressedTiles.length} bytes of tile data (expected: ${numTiles * 32})`);
    
    if (decompressedTiles.length < numTiles * 32) {
        console.warn(`WARNING: Only partially decompressed ${decompressedTiles.length} of ${numTiles * 32} expected bytes`);
        console.warn('Saving partial result - the output file may be incomplete');
    }
      // Create output file
    const mapDataSize = Math.max(0, input.length - Math.min(mapOffset, input.length));
    const outputSize = 8 + 2 + decompressedTiles.length + paletteSize + mapDataSize;
    const output = Buffer.alloc(outputSize);
    let outputPos = 0;
    
    console.log(`Output buffer size: ${outputSize} bytes (header: 10, tiles: ${decompressedTiles.length}, palette: ${paletteSize}, map: ${mapDataSize})`);
    
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
      // Copy palette data (if available)
    if (paletteOffset < input.length) {
        const actualPaletteSize = Math.min(paletteSize, input.length - paletteOffset);
        if (actualPaletteSize > 0) {
            input.copy(output, outputPos, paletteOffset, paletteOffset + actualPaletteSize);
            outputPos += actualPaletteSize;
            console.log(`Copied ${actualPaletteSize} bytes of palette data (expected ${paletteSize})`);
        } else {
            console.warn(`WARNING: Palette offset ${paletteOffset} is at end of file, no palette data available`);
        }
        
        // Fill remaining palette space with zeros if needed
        if (actualPaletteSize < paletteSize) {
            const missingBytes = paletteSize - actualPaletteSize;
            output.fill(0, outputPos, outputPos + missingBytes);
            outputPos += missingBytes;
            console.warn(`WARNING: Filled ${missingBytes} missing palette bytes with zeros`);
        }
    } else {
        console.warn(`WARNING: Palette offset ${paletteOffset} is beyond file size ${input.length}, filling with zeros`);
        output.fill(0, outputPos, outputPos + paletteSize);
        outputPos += paletteSize;
    }
    
    // Copy map data (if available)
    const mapDataStart = mapOffset;
    let mapDataEnd = input.length;
    
    if (mapDataStart < input.length) {
        // Check if there's an end marker at the very end
        if (input.length >= 4 && input.readUInt32BE(input.length - 4) === 0xFFFFFFFF) {
            mapDataEnd = input.length - 4;
        }
        
        const actualMapSize = mapDataEnd - mapDataStart;
        if (actualMapSize > 0) {
            input.copy(output, outputPos, mapDataStart, mapDataEnd);
            outputPos += actualMapSize;
            console.log(`Copied ${actualMapSize} bytes of map data`);
        } else {
            console.warn(`WARNING: Map offset ${mapDataStart} is at end of file, no map data available`);
        }
    } else {
        console.warn(`WARNING: Map offset ${mapDataStart} is beyond file size ${input.length}, no map data to copy`);
    }
    
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