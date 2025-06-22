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
    
    copyBackReferenceBackwards(offset, count) {
        const result = [];
        for (let i = 0; i < count; i++) {
            const srcPos = this.position - offset - i;
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
            
            case 0x1: // Extended Literal copy
                const literalCountExt = param + 17;
                if (additionalBytes.length < literalCountExt) {
                    throw new Error(`Not enough bytes for literal copy: need ${literalCountExt}, got ${additionalBytes.length}`);
                }
                const literalBytesExt = additionalBytes.slice(0, literalCountExt);
                this.writeBytes(literalBytesExt);
                return {
                    command: 'literal',
                    count: literalCountExt,
                    bytes: literalBytesExt,
                    consumed: literalCountExt
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

            case 0x4: // back reference
                // 8 -> 10 00 -> 0+2 bytes from 2+2 bytes back (end offset)
                const paramUpperBits4 = (param >> 2) & 0x3 // Shift right 2, mask with 0b11
                const paramLowerBits4 = param & 0x3; // Mask with 0b11
                // const shortOffset4 = paramUpperBits4;
                const shortOffset4 = paramUpperBits4 == 0 ? 1 : paramUpperBits4;
                const shortCount4 = paramLowerBits4 + 2;
                // console.log('AA SHORT', param, shortOffset, shortCount);
                // console.log('AA6', param, paramUpperBits, paramLowerBits, shortOffset6, shortCount6);
                const shortBytes4 = this.repeatPattern(shortOffset4, shortCount4);
                return {
                    command: 'short_back_ref4',
                    offset: shortOffset4+shortCount4,
                    count: shortCount4,
                    bytes: shortBytes4,
                    consumed: 0
                }

            case 0x5: // Short back reference
                /**
                 * Computes the number of bytes for offset and length based on the 4-bit parameter X.
                 * @param {number} X - The 4-bit parameter (0 to 15).
                 * @returns {Object} An object with properties Y (offset bytes) and Z (length bytes).
                 */
                function getOffsetAndLengthBytes(X) {
                    const Y = 3 + ((X >> 3) & 1);
                    const Z = 2 + (X & 7);
                    return { Y, Z };
                }
                const copyParams = getOffsetAndLengthBytes(param);
                const shortOffset = copyParams.Y;
                const shortCount = copyParams.Z;
                // console.log('AA SHORT', param, shortOffset, shortCount);
                const shortBytes = this.repeatPattern(shortOffset, shortCount);
                return {
                    command: 'short_back_ref',
                    offset: shortOffset,
                    count: shortCount,
                    bytes: shortBytes,
                    consumed: 0
                };
            case 0x6: // back reference
                // 68 -> copy 2 bytes from 4-6 bytes back
                // 8 -> 10 00 -> 0+2 bytes from 2+2 bytes back (end offset)
                const paramUpperBits = (param >> 2) & 0x3 // Shift right 2, mask with 0b11
                const paramLowerBits = param & 0x3; // Mask with 0b11
                const shortOffset6 = paramUpperBits + 2;
                const shortCount6 = paramLowerBits + 2;
                // console.log('AA SHORT', param, shortOffset, shortCount);
                console.log('AA6', param, paramUpperBits, paramLowerBits, shortOffset6, shortCount6);
                const shortBytes6 = this.copyBackReference(shortOffset6+shortCount6, shortCount6);
                return {
                    command: 'short_back_ref6',
                    offset: shortOffset6+shortCount6,
                    count: shortCount6,
                    bytes: shortBytes6,
                    consumed: 0
                }
            case 0x7: // Back reference Pattern with byte offset
                const paramUpperBits7 = (param >> 2) & 0x3 // Shift right 2, mask with 0b11
                const paramLowerBits7 = param & 0x3; // Mask with 0b11
                const backRefCount7 = paramLowerBits7 + 2;
                const backRefOffset7 = paramUpperBits7 + 6;
                const backRefSequence7 = this.repeatPattern(backRefOffset7, backRefCount7);
                // console.log('AA TEST', backRefSequence);
                return {
                    command: 'back_ref_7',
                    offset: backRefOffset7,
                    count: backRefCount7,
                    bytes: backRefSequence7,
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
                // const backRefCountAlt = (param*2) + 1 + 2; // added additional 2 bytes-- question if this should be in or out of bracket
                // const backRefCountAlt = (3*param) - 8;
                // const backRefCountAlt = 6 * Math.floor(param / 4) + (param % 4) + 10;
                const backRefCountAlt = 2 * param + Math.floor(param / 4) + 1;
                // B --> (11*2) + 1 + 2 = 22 + 3 = 25
                // B -> 1011
                // C --> (12*2) + 1 + 2 = 24 + 3 = 27 -> should be 28
                // C -> 1100
                if (additionalBytes.length < 1) {
                    throw new Error('Not enough bytes for back reference command');
                }
                const signedAdditionalBytes = additionalBytes[0] > 127 ? (additionalBytes[0] - 128) : additionalBytes[0]
                console.log('AA9', param, additionalBytes[0], signedAdditionalBytes, backRefCountAlt);
                const backRefOffsetAlt = signedAdditionalBytes+1;
                const backRefBytesAlt = this.repeatPattern(backRefOffsetAlt, backRefCountAlt);
                return {
                    command: 'back_ref_9',
                    offset: backRefOffsetAlt,
                    count: backRefCountAlt,
                    bytes: backRefBytesAlt,
                    consumed: 1
                };

            case 0xA: // Back reference Pattern with byte offset
                if (additionalBytes.length < 1) {
                    throw new Error('Not enough bytes for back reference command');
                }
                const backRefOffsetA = param + 2;
                const additionalBytesUpperBits = (additionalBytes[0] >> 4) & 0xF // Shift right 2, mask with 0b11
                const additionalBytesLowerBits = additionalBytes[0] & 0xF; // Mask with 0b11
                const backRefCountA = additionalBytesUpperBits * backRefOffsetA;
                console.log(backRefOffsetA, backRefCountA, additionalBytes[0], additionalBytesUpperBits, additionalBytesLowerBits);
                const backRefSequenceA = this.repeatPattern(backRefOffsetA, backRefCountA);
                // console.log('AA TEST', backRefSequence);
                return {
                    command: 'back_ref_A',
                    offset: backRefOffsetA,
                    count: backRefCountA,
                    bytes: backRefSequenceA,
                    consumed: 1
                };

            case 0xC: // Fixed offset back reference
                const paramUpperBitsC = (param >> 2) & 0x3 // Shift right 2, mask with 0b11
                const paramLowerBitsC = param & 0x3; // Mask with 0b11

                const fixedCount = paramLowerBitsC + 2;
                const fixedOffset = paramUpperBitsC + 1;
                const fixedBytes = this.copyBackReferenceBackwards(fixedOffset, fixedCount);
                return {
                    command: 'backwards_ref',
                    offset: fixedOffset,
                    count: fixedCount,
                    bytes: fixedBytes,
                    consumed: 0
                };

            case 0xD: // Fixed offset back reference
                const paramUpperBitsD = (param >> 2) & 0x3 // Shift right 2, mask with 0b11
                const paramLowerBitsD = param & 0x3; // Mask with 0b11

                const fixedCountD = paramUpperBitsD + 3;
                const fixedOffsetD = paramLowerBitsD + 4;
                const fixedBytesD = this.copyBackReferenceBackwards(fixedOffsetD, fixedCountD);
                return {
                    command: 'backwards_ref_D',
                    offset: fixedOffsetD,
                    count: fixedCountD,
                    bytes: fixedBytesD,
                    consumed: 0
                };
                
            case 0xE: // Fixed offset back reference
                const fixedCountExt = param + 3;
                const fixedOffsetExt = additionalBytes[0];
                console.log('AA E', param, fixedOffsetExt, fixedCountExt);
                const fixedBytesExt = this.copyBackReferenceBackwards(fixedOffsetExt, fixedCountExt);
                return {
                    command: 'backwards_ref_ext',
                    offset: fixedOffsetExt,
                    count: fixedCountExt,
                    bytes: fixedBytesExt,
                    consumed: 1
                };
            
            default:
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
            case 0x1: // Extended Literal copy
                additionalBytesNeeded = (commandByte & 0xF) + 17;
                break;
            case 0x3: // RLE
            case 0x8: // Back reference
            case 0x9: // Back reference alternative
            case 0xA: // Back reference Pattern with byte offset
            case 0xE: // Copy backwards Extended
                additionalBytesNeeded = 1;
                break;
            case 0x4: // Short back reference
            case 0x5: // Short back reference
            case 0x6: // Short back reference
            case 0x7: // Back reference Pattern with byte offset
            case 0xC: // Fixed back reference
            case 0xD: // Fixed back reference
                additionalBytesNeeded = 0;
                break;
            default:
                console.error(`Unknown command: 0x${cmd.toString(16)} at position ${pos - 1}`);
                console.log('Stopping decompression and saving partial result...');
                break;
        }
        
        // If we hit an unknown command, break out of the main loop
        if (cmd !== 0x0 && cmd !== 0x1 && cmd !== 0x3 && cmd !== 0x8 && cmd !== 0x9 && cmd !== 0x4 && cmd !== 0x5 && cmd !== 0x6 && cmd !== 0x7 && cmd !== 0xA && cmd !== 0xC && cmd !== 0xD && cmd !== 0xE) {
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