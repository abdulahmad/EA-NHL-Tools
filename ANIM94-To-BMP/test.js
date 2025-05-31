const fs = require('fs');

// Configuration
const SPRITE_DATA_BASE = 0xCA56A;    // Sprite data file base address
const SPRITE_TILE_OFFSET = 0xA;
const SPRITE_DATA_OFFSET = 0xAD;     // Header offset to SprStrdat
const SIZE_TAB_ADDRESS = 0x79F50;    // sizetab address
const SPRITE_TILES_ADDRESS = 0x5DE84; // Assumed from NHL '94
const SIZE_TAB = [1, 2, 3, 4, 2, 4, 6, 8, 3, 6, 9, 12, 4, 8, 12, 16];

// Simulate sprite structure (A3)
class SpriteStructure {
  constructor() {
    this.frame = 0;        // Offset $6 in A3
    this.oldFrame = 0;     // Offset assumed similar to NHL '92
    this.attribute = 0;    // Offset $4 in A3
    this.vrChar = 0;       // Base VRAM character offset
    this.vrOffs = [];      // VRAM offsets per sprite
  }
}

// Simulate sprite table entry (8 bytes)
class SpriteTableEntry {
  constructor(yPos, sizeLink, link, tileIndex, xPos) {
    this.yPos = yPos;          // Word at offset 0
    this.sizeLink = sizeLink;  // Byte at offset 2 (size bits), byte at offset 3 (link)
    this.tileIndex = tileIndex; // Word at offset 4
    this.xPos = xPos;          // Word at offset 6
  }
}

// Read 16-bit word (big-endian)
function readWord(buffer, offset) {
  return (buffer[offset] << 8) | buffer[offset + 1];
}

// Read 32-bit long (big-endian)
function readLong(buffer, offset) {
  return (buffer[offset] << 24) | (buffer[offset + 1] << 16) | (buffer[offset + 2] << 8) | buffer[offset + 3];
}

// Parse sprite data for a given frame, mimicking addframe2
function parseAddFrame2(romPath, frameNumber, xScreen, yScreen, attribute = 0) {
  try {
    const rom = fs.readFileSync(romPath);

    // Simulate registers and memory
    const spriteStruct = new SpriteStructure();
    spriteStruct.frame = frameNumber;
    spriteStruct.attribute = attribute; // User-provided or default
    let linkCounter = 0; // D6: Link counter
    const dmaList = [];  // A5: DMA transfer list
    const spriteTable = []; // A6: Sprite table

    // --- Frame Validation ---
    // ASM: 382B 0006  MOVE.W $6(A3),D4    ; Load frame
    // ASM: 6B00 0194  BMI .exit           ; Exit if negative
    // ASM: 6700 0190  BEQ .exit           ; Exit if zero
    // ASM: 0244 07FF  ANDI.W #$07FF,D4   ; Mask to 11 bits
    if (frameNumber < 1 || frameNumber > 2047) {
      console.error('Invalid frame number. Must be between 1 and 2047.');
      return { dmaList, spriteTable };
    }
    console.log(`Parsing frame ${frameNumber} (0x${frameNumber.toString(16).padStart(4, '0')})`);

    // --- Load Frame Table Address ---
    // ASM: 247C 000C A56A  MOVE.L #$CA56A,A2   ; A2 = sprite data file base
    // ASM: 200A            MOVE.L (A2),D0      ; D0 = frame table address
    const frameTableAddress = readLong(rom, SPRITE_DATA_BASE+4);
    console.log(`Frame table address at 0x${SPRITE_DATA_BASE.toString(16)}: 0x${frameTableAddress.toString(16)}`);

    // --- Read Frame Offset ---
    // Custom: Use (frameNumber - 1) * 2 for 2-byte frame table entries
    const frameTableOffset = SPRITE_DATA_BASE + frameTableAddress + ((frameNumber - 1) * 2);
    const frameOffset = readWord(rom, frameTableOffset);
    const nextFrameOffset = readWord(rom, frameTableOffset+2);
    console.log(`Frame table entry at 0x${frameTableOffset.toString(16)}: Offset = 0x${frameOffset.toString(16)}`);

    // --- Calculate Sprite Data Pointer ---
    // ASM: 0680 0000 00AD  ADD.L #$AD,D0       ; Adjust for header
    // const spriteDataPtr = SPRITE_DATA_BASE + frameOffset + SPRITE_DATA_OFFSET;
    const spriteDataPtr = SPRITE_DATA_BASE + frameTableAddress + frameOffset;
    console.log(`Sprite data pointer = 0x${spriteDataPtr.toString(16)} (base 0x${SPRITE_DATA_BASE.toString(16)} + offset 0x${frameTableAddress.toString(16)} + 0x${frameOffset.toString(16)})`);

    // --- Read Sprite Count ---
    // ASM: move SprStrnum(a2),d5  ; Number of sprites (NHL '92 equivalent)
    // const spriteCount = readWord(rom, spriteDataPtr + 2);
    const spriteCount = (nextFrameOffset - frameOffset) / 8; // Each sprite entry is 8 bytes
    console.log(`Sprite count at 0x${(spriteDataPtr + 2).toString(16)}: ${spriteCount}`);

    if (spriteCount > 0xFFFF) {
      console.error('Invalid sprite count.');
      return { dmaList, spriteTable };
    }

    // --- Initialize Loop Variables ---
    // ASM: clr d3              ; D3 = VRAM offset accumulator
    // ASM: clr d4              ; D4 = previous tile count
    let vramOffset = spriteStruct.vrChar; // D3
    let prevTileCount = 0; // D4
    let prevTileIndex = 0; // For duplicate check
    let spriteDataOffset = spriteDataPtr; // A2: Start of SprStrdat

    // --- Sprite Loop ---
    // ASM: .sloop
    for (let i = 0; i < spriteCount; i++) {
      console.log(`\nSprite ${i + 1}:`);

      // --- Check Frame Change ---
      // ASM: move frame(a3),d0
      // ASM: cmp oldframe(a3),d0
      // ASM: beq .noref
      const isNewFrame = spriteStruct.frame !== spriteStruct.oldFrame || i === spriteCount - 1;
      if (isNewFrame && i === spriteCount - 1) {
        spriteStruct.oldFrame = spriteStruct.frame; // Update oldframe
      }

      // --- Read Sprite Data ---
      // ASM: move 4(a2),d2      ; Tile index
      // ASM: move.b 2(a2),d4    ; Size byte
      const tileIndex = readWord(rom, spriteDataOffset + 4) & 0x7FF; // AND #$7FF
      const sizeByte = rom[spriteDataOffset + 2];
      const tileCount = SIZE_TAB[sizeByte & 0x0F]; // ASM: move.b 0(a0,d4),d4
    //   const yGlobal = readWord(rom, spriteDataOffset); 
      const yGlobal = rom.readInt16BE(spriteDataOffset);
    //   const xGlobal = readWord(rom, spriteDataOffset + 6);
      const xGlobal = rom.readInt16BE(spriteDataOffset + 6);

      console.log(`  Y global: ${yGlobal} (offset 0x${(spriteDataOffset).toString(16)})`);
      console.log(`  Size byte: 0x${sizeByte.toString(16)} (offset 0x${(spriteDataOffset + 2).toString(16)}), Tile count: ${tileCount}`);
      console.log(`  Tile index: ${tileIndex} (offset 0x${(spriteDataOffset + 4).toString(16)})`);
      console.log(`  X global: ${xGlobal} (offset 0x${(spriteDataOffset + 6).toString(16)})`);

      // --- Check for Duplicate Tiles ---
      // ASM: cmp 8(a7),d4       ; Compare tile count
      // ASM: bgt .nodup
      // ASM: cmp 4(a7),d2       ; Compare tile index
      // ASM: blt .nodup
      let isDuplicate = false;
      if (isNewFrame && i > 0) {
        if (tileCount <= prevTileCount && tileIndex >= prevTileIndex) {
          const lastDataEnd = prevTileIndex + prevTileCount;
          const overlap = lastDataEnd - tileIndex - tileCount;
          if (overlap >= 0) {
            isDuplicate = true; // ASM: bra .dup
            console.log(`  Duplicate tile detected: Using previous VRAM offset`);
          }
        }
      }

      // --- VRAM and DMA Setup ---
      // ASM: add VRchar(a3),d3
      // ASM: move.l Spritetiles,a0
      // ASM: ext.l d2
      // ASM: asl.l #5,d2
      // ASM: add.l d2,a0
      // ASM: asl #4,d4
      // ASM: asl #5,d3
      // ASM: move.l a0,(a5)+
      // ASM: move d4,(a5)+
      // ASM: move d3,(a5)+
      if (!isDuplicate) {
        vramOffset += prevTileCount * 32; // Update VRAM offset
        const tileAddress = SPRITE_TILES_ADDRESS + (tileIndex * 32); // ASM: asl.l #5,d2
        const wordsToTransfer = tileCount * 16; // ASM: asl #4,d4 (tiles * 32 bytes / 2)
        const vramDest = vramOffset * 2; // ASM: asl #5,d3 (VRAM in bytes)
        dmaList.push({ source: tileAddress, words: wordsToTransfer, dest: vramDest });
        console.log(`  DMA: Source 0x${tileAddress.toString(16)}, Words ${wordsToTransfer}, VRAM dest ${vramDest} (0x${vramDest.toString(16)})`);
      }

      // --- Store VRAM Offset ---
      // ASM: move.b d3,VRoffs(a3,d5)
      spriteStruct.vrOffs[i] = vramOffset & 0xFF;
      console.log(`  VRAM offset: ${vramOffset} (stored at index ${i})`);

      // --- Coordinate Adjustments ---
      // ASM: move (a7)+,d0      ; Restore X coordinate
      // ASM: movem d0-d2,-(a7)  ; Save for sprite attributes
      // ASM: move (a2),d2       ; Y global
      let xPos = xScreen;
      let yPos = yScreen;
      let finalTileIndex = tileIndex;

      // --- Y Flip ---
      // ASM: btst #4,attribute(a3)
      // ASM: beq .noyflip
      // ASM: move.b 2(a2),d2
      // ASM: and #%0011,d2
      // ASM: add #1,d2
      // ASM: asl #3,d2
      // ASM: neg d2
      // ASM: sub (a2),d2
      if (spriteStruct.attribute & (1 << 4)) { // Y flip
        let sizeHeight = (sizeByte & 0x03) + 1; // Height in tiles
        sizeHeight *= 8; // Pixels (ASM: asl #3,d2)
        sizeHeight = -sizeHeight; // Negate
        yPos += sizeHeight - yGlobal; // Adjust Y
        console.log(`  Y flip applied: Adjusted Y = ${yPos}`);
      } else {
        yPos += yGlobal; // ASM: add d2,d1
        console.log(`  No Y flip: Adjusted Y = ${yPos}`);
      }

      // --- X Flip ---
      // ASM: move 6(a2),d2
      // ASM: btst #3,attribute(a3)
      // ASM: beq .noxflip
      // ASM: move.b 2(a2),d2
      // ASM: and #%1100,d2
      // ASM: add #%0100,d2
      // ASM: asl #1,d2
      // ASM: neg d2
      // ASM: sub 6(a2),d2
      if (spriteStruct.attribute & (1 << 3)) { // X flip
        let sizeWidth = ((sizeByte & 0x0C) >> 2) + 1; // Width in tiles
        sizeWidth *= 8; // Pixels (ASM: asl #1,d2 after add #%0100)
        sizeWidth = -sizeWidth; // Negate
        xPos += sizeWidth - xGlobal; // Adjust X
        console.log(`  X flip applied: Adjusted X = ${xPos}`);
      } else {
        xPos += xGlobal; // ASM: add d2,d0
        console.log(`  No X flip: Adjusted X = ${xPos}`);
      }

      // --- Sprite Attribute Writing ---
      // ASM: move d1,(a6)       ; Write Y position
      // ASM: move.b 2(a2),2(a6) ; Write size bits
      // ASM: move.b d6,3(a6)    ; Write link
      // ASM: move 4(a2),d2      ; Tile index
      // ASM: move attribute(a3),d0
      // ASM: eor d0,d2
      // ASM: and #$f800,d2      ; Palette bits
      let paletteBits = (readWord(rom, spriteDataOffset + 4) ^ spriteStruct.attribute) & 0xF800;

      // --- Special Palette Handling ---
      // ASM: btst #0,attribute+1(a3)
      // ASM: beq .nospec
      // ASM: btst #14,d2
      // ASM: beq .nospec
      // ASM: bset #13,d2        ; Team 2 color
      if ((spriteStruct.attribute & 0x0100) && (paletteBits & (1 << 14))) {
        paletteBits |= 1 << 13; // Set team 2 color
        console.log(`  Team 2 color applied: Palette bits = 0x${paletteBits.toString(16)}`);
      }
      const palIndex = (paletteBits >> 14) & 0b11;
      console.log(`  Palette bits: 0x${paletteBits.toString(16)}`, 'palette index:', palIndex);
      // --- Final Tile Index ---
      // ASM: or.b VRoffs(a3,d5),d2
      // ASM: add VRchar(a3),d2
      finalTileIndex = (paletteBits | spriteStruct.vrOffs[i]) + spriteStruct.vrChar;
      console.log(`  Final tile index: ${finalTileIndex} (0x${finalTileIndex.toString(16)})`);

      // --- Write to Sprite Table ---
      // ASM: move d2,4(a6)      ; Write tile index
      // ASM: move d0,6(a6)      ; Write X position
      spriteTable.push(new SpriteTableEntry(yPos, sizeByte, linkCounter, finalTileIndex, xPos));
      console.log(`  Sprite table entry: Y=${yPos}, Size=0x${sizeByte.toString(16)}, Link=${linkCounter}, Tile=${finalTileIndex}, X=${xPos}`);

      // --- Update Loop Variables ---
      // ASM: add #1,d6          ; Increment link counter
      // ASM: add #8,a6          ; Next sprite table entry
      // ASM: add #8,a2          ; Next sprite data
      linkCounter++; // D6
      prevTileIndex = tileIndex; // For next duplicate check
      prevTileCount = tileCount; // For next duplicate check
      spriteDataOffset += 8; // A2
    }

    // --- Exit ---
    // ASM: .exit
    // ASM: movem.l (a7)+,d0-d5/a0-a2
    // ASM: move.w (a7)+,$4(a3) ; Restore frame (not needed in JS)
    // ASM: rts
    return { dmaList, spriteTable };

  } catch (error) {
    console.error('Error reading ROM file:', error.message);
    return { dmaList: [], spriteTable: [] };
  }
}

// Command-line interface
const args = process.argv.slice(2);
if (args.length < 2 || args.length > 4) {
  console.error('Usage: node script.js <rom_path> <frame_number> [x_screen] [y_screen]');
  process.exit(1);
}

const romPath = args[0];
const frameNumber = parseInt(args[1], 10);
const xScreen = args[2] ? parseInt(args[2], 10) : 0; // Default X coordinate
const yScreen = args[3] ? parseInt(args[3], 10) : 0; // Default Y coordinate
const result = parseAddFrame2(romPath, frameNumber, xScreen, yScreen);
console.log('\nDMA List:', result.dmaList);
console.log('Sprite Table:', result.spriteTable);