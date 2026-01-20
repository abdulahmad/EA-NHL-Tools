import fs from 'fs';
import path from 'path';
// const fs = require('fs');          // only needed in Node.js
// const path = require('path');

// ────────────────────────────────────────────────────────────────
// Your existing global memory (example: 16 MB, typical for MD emulator)
// ────────────────────────────────────────────────────────────────
const MEMORY_SIZE = 16 * 1024 * 1024;           // 16 MB
const memory = new Uint8Array(MEMORY_SIZE);

// Optional: mirrored views for easier word/long access (big-endian)
const memory16 = new Uint16Array(memory.buffer);
const memory32 = new Uint32Array(memory.buffer);

// ────────────────────────────────────────────────────────────────
// Load the ROM file once at startup
// ────────────────────────────────────────────────────────────────
function loadROM() {
  const romPath = 'nhlpa93retailRevA.bin';

  try {
    const romBuffer = fs.readFileSync(romPath);
    console.log(`Loaded ROM: ${romPath} (${romBuffer.length} bytes)`);

    if (romBuffer.length > MEMORY_SIZE) {
      console.error("ROM too large for memory!");
      process.exit(1);
    }

    // Copy ROM into memory at address 0x000000 (standard cartridge mapping)
    memory.set(romBuffer, 0);

    // Optional: console.log first few longwords to verify
    console.log("ROM header check:");
    console.log("  0x0000 =", memory32[0].toString(16).padStart(8, '0'));     // usually SEGA logo chars
    console.log("  0x0100 =", memory32[0x40].toString(16).padStart(8, '0'));  // entry point often here

  } catch (err) {
    console.error("Failed to load ROM:", err.message);
    process.exit(1);
  }
}

// ────────────────────────────────────────────────────────────────
// Global 68000-style registers (32-bit unsigned)
let d0 = 0, d1 = 0, d2 = 0, d3 = 0, d4 = 0, d5 = 0, d6 = 0, d7 = 0;
let a0 = 0, a1 = 0, a2 = 0, a3 = 0, a4 = 0, a5 = 0, a6 = 0, a7 = 0;

// Global Condition Code Register (CCR)
const CCR = {
  N: false,   // Negative
  Z: false,   // Zero
  V: false,   // Overflow
  C: false,   // Carry
  X: false    // Extend
};

function resetCCR() {
  CCR.N = CCR.Z = CCR.V = CCR.C = CCR.X = false;
}

// Size masks and sign bit positions
const MASK = {
  b: 0xFF,
  w: 0xFFFF,
  l: 0xFFFFFFFF
};

const SIGN_BIT = {
  b: 0x80,
  w: 0x8000,
  l: 0x80000000
};

const BIT_WIDTH = {
  b: 8,
  w: 16,
  l: 32
};

// ────────────────────────────────────────────────────────────────
// MOVE  src, dst    (register → register only for now)
// ────────────────────────────────────────────────────────────────
function MOVE(srcValue, dstReg, size = 'l') {
    const mask = MASK[size];
    const value = srcValue & mask;

    // Write to destination register
    if (dstReg === d0) d0 = value;
    else if (dstReg === d1) d1 = value;
    else if (dstReg === d2) d2 = value;
    else if (dstReg === d3) d3 = value;
    else if (dstReg === d4) d4 = value;
    else if (dstReg === d5) d5 = value;
    else if (dstReg === d6) d6 = value;
    else if (dstReg === d7) d7 = value;
    else if (dstReg === a0) a0 = value;
    else if (dstReg === a1) a1 = value;
    else if (dstReg === a2) a2 = value;
    else if (dstReg === a3) a3 = value;
    else if (dstReg === a4) a4 = value;
    else if (dstReg === a5) a5 = value;
    else if (dstReg === a6) a6 = value;
    else if (dstReg === a7) a7 = value;
    else {
    console.warn("MOVE: unsupported destination");
    return;
    }

    // Update flags (MOVE to data reg or memory affects them)
    const msbPos = size === 'b' ? 7 : size === 'w' ? 15 : 31;
    const negative = (value >>> msbPos) & 1;
    const zero = value === 0;

    CCR.N = !!negative;
    CCR.Z = !!zero;
    CCR.V = false;
    CCR.C = false;
    // X unchanged
}

// ────────────────────────────────────────────────────────────────
// MOVEA  src, An    (only to address registers)
// ────────────────────────────────────────────────────────────────
function MOVEA(srcValue, dstAn, size = 'l') {
    if (size === 'b') {
    console.error("MOVEA .b is illegal");
    return;
    }

    let value;
    if (size === 'w') {
    const signExtend = (srcValue & 0x8000) ? 0xFFFF0000 : 0;
    value = (srcValue & 0xFFFF) | signExtend;
    } else {
    value = srcValue & 0xFFFFFFFF;
    }

    // Write only to A-registers
    if (dstAn === a0) a0 = value;
    else if (dstAn === a1) a1 = value;
    else if (dstAn === a2) a2 = value;
    else if (dstAn === a3) a3 = value;
    else if (dstAn === a4) a4 = value;
    else if (dstAn === a5) a5 = value;
    else if (dstAn === a6) a6 = value;
    else if (dstAn === a7) a7 = value;
    else {
    console.warn("MOVEA: destination must be A0–A7");
    return;
    }

    // Flags unchanged
}

// ────────────────────────────────────────────────────────────────
// ASL   #count / reg, Dn    (shift left, destination must be data reg)
// ────────────────────────────────────────────────────────────────
function ASL(count, dstReg, size = 'l') {
    if (count < 0) {
    console.error("ASL: negative shift count");
    return;
    }

    let value;
    if (dstReg === d0) value = d0;
    else if (dstReg === d1) value = d1;
    else if (dstReg === d2) value = d2;
    else if (dstReg === d3) value = d3;
    else if (dstReg === d4) value = d4;
    else if (dstReg === d5) value = d5;
    else if (dstReg === d6) value = d6;
    else if (dstReg === d7) value = d7;
    else {
    console.warn("ASL: destination must be D0–D7");
    return;
    }

    const mask = MASK[size];
    const signMask = SIGN_BIT[size];
    const bits = BIT_WIDTH[size];

    value &= mask;

    // Shift count ≥ bit width → result = 0, V=1, C=0, X=0
    if (count >= bits) {
    if (dstReg === d0) d0 = 0;
    else if (dstReg === d1) d1 = 0;
    else if (dstReg === d2) d2 = 0;
    else if (dstReg === d3) d3 = 0;
    else if (dstReg === d4) d4 = 0;
    else if (dstReg === d5) d5 = 0;
    else if (dstReg === d6) d6 = 0;
    else if (dstReg === d7) d7 = 0;

    CCR.N = false;
    CCR.Z = true;
    CCR.V = true;
    CCR.C = false;
    CCR.X = false;
    return;
    }

    // count === 0 → only update N/Z from current value
    if (count === 0) {
    const neg = (value & signMask) !== 0;
    CCR.N = neg;
    CCR.Z = value === 0;
    CCR.V = false;
    CCR.C = false;
    // X unchanged
    return;
    }

    const wasNegative = (value & signMask) !== 0;

    // Perform shift
    const shifted = (value << count) & mask;

    // Write back
    if (dstReg === d0) d0 = shifted;
    else if (dstReg === d1) d1 = shifted;
    else if (dstReg === d2) d2 = shifted;
    else if (dstReg === d3) d3 = shifted;
    else if (dstReg === d4) d4 = shifted;
    else if (dstReg === d5) d5 = shifted;
    else if (dstReg === d6) d6 = shifted;
    else if (dstReg === d7) d7 = shifted;

    // Flags
    const isNegative = (shifted & signMask) !== 0;
    const overflow = wasNegative !== isNegative;           // sign changed → overflow

    // Carry = last bit shifted out
    const carry = ((value >>> (bits - count)) & 1) !== 0;

    CCR.N = isNegative;
    CCR.Z = shifted === 0;
    CCR.V = overflow;
    CCR.C = carry;
    CCR.X = carry;
}

// ────────────────────────────────────────────────────────────────
// move.w (a0)+, d0
// ────────────────────────────────────────────────────────────────
function MOVEDATAINC(srcValue, dstReg, size = 'w') {  // srcValue = a0, dstReg = d0
    if (size !== 'w') {
    console.warn("This helper is for .w only");
    return;
    }

    // 1. Get current address from address register
    const addr = srcValue;                     // e.g. current value of a0
    console.log(`MOVEDATAINC: reading from address 0x${addr.toString(16)}`);
    // 2. Read 16-bit value from memory (big-endian = Motorola 68k style)
    //    Two ways — choose one:

    // Way A: using byte array (most accurate)
    const value =
    (memory[addr]     << 8) |
    (memory[addr + 1] << 0);

    // Way B: using Uint16Array view (faster, assumes aligned access)
    // const value = memory16[addr >>> 1];   // addr must be even

    // 3. Write value to d0 (zero-extend to 32 bits)
    if (dstReg === d0)      d0 = value & 0xFFFF;
    else if (dstReg === d1) d1 = value & 0xFFFF;
    else if (dstReg === d2) d2 = value & 0xFFFF;
    else if (dstReg === d3) d3 = value & 0xFFFF;
    else if (dstReg === d4) d4 = value & 0xFFFF;
    else if (dstReg === d5) d5 = value & 0xFFFF;
    else if (dstReg === d6) d6 = value & 0xFFFF;
    else if (dstReg === d7) d7 = value & 0xFFFF;
    // ... add other d3–d7 if needed

    // 4. Post-increment the address register by 2 bytes
    srcValue += 2;

    // Write back the incremented value
    if (srcValue === a0)      a0 = srcValue;
    else if (srcValue === a1) a1 = srcValue;
    else if (srcValue === a2) a2 = srcValue;
    else if (srcValue === a3) a3 = srcValue;
    else if (srcValue === a4) a4 = srcValue;
    else if (srcValue === a5) a5 = srcValue;
    else if (srcValue === a6) a6 = srcValue;
    else if (srcValue === a7) a7 = srcValue;
    // ... etc.

    // 5. Update condition codes (MOVE affects N/Z/V/C)
    const negative = (value & 0x8000) !== 0;   // bit 15 set
    const zero     = (value & 0xFFFF) === 0;

    CCR.N = negative;
    CCR.Z = zero;
    CCR.V = false;
    CCR.C = false;
    // X unchanged
}


function startDecompression(jimDataPtr) {
    loadROM();
    console.log(`Starting decompression at 0x${jimDataPtr.toString(16)}`);
    let pos = jimDataPtr
    console.log(`Data pointer at 0x${pos.toString(16)}`);
    console.log("Starting with clean flags:");
    resetCCR();
    console.log("Initial CCR:", { ...CCR });
    // var pos = jimDataPtr;
    let paletteOffset = readl(pos); pos = incl(pos);
    console.log(`Palette offset: 0x${paletteOffset.toString(16)}`);
    let tileMapHeaderOffset = readl(pos); pos = incl(pos);
    console.log(`Tile map header offset: 0x${tileMapHeaderOffset.toString(16)}`);
    a2 = pos;
    let tileOffset = 0;
    d4 = tileOffset;
    decompressGraphics();
}

function decompressGraphics() {
    console.log("Decompressing graphics...");
    MOVEA(a2,a0,'l'); // current position in data
    console.log(`Data start at 0x${a0.toString(16)}`);
    MOVE(d4,d1,'w'); // tile offset in bytes
    console.log(`Tile offset: 0x${d1.toString(16)}`);
    ASL(5,d1,'w'); // d1 = d1 * 32 (tile byte offset)
    console.log(`Tile byte offset: 0x${d1.toString(16)}`);
    MOVEDATAINC(a0,d0,'w'); // read first opcode (80 3D)
    console.log(`First opcode: 0x${d0.toString(16)}`);
}

function decompress(data, pos) {
    // d0 = -d0; // make positive, number of tiles to decompress
    // console.log(`Compressed block: ${d0} tiles expected`);

    // d4 = d4+d0; // advance tile index by this many tiles
    // decompressBytecode(data, pos);
}

function decompressBytecode(data, pos) {
    // a1 = -1;
    // a3 = -1;
    // d3 = d1; // (tile byte offset)
    // d1 = 0;
    // d2 = 0;

    // Main decompression loop
}

function readb(addr) { //1 byte, 8 bits
    return memory[addr];
}
function readw(addr) { //2 bytes, 16 bits
    return (memory[addr] << 8) | memory[addr + 1];
}
function readl(addr) { //4 bytes, 32 bits
    console.log(`readl: reading 4 bytes from address 0x${addr.toString(16)}`);
    console.log(`  bytes: ${memory[addr].toString(16).padStart(2,'0')} ${memory[addr+1].toString(16).padStart(2,'0')} ${memory[addr+2].toString(16).padStart(2,'0')} ${memory[addr+3].toString(16).padStart(2,'0')}`);
    return (
        (memory[addr]     << 24) |
        (memory[addr + 1] << 16) |
        (memory[addr + 2] <<  8) |
        (memory[addr + 3] <<  0)
    );
}
function incb(pos) {
    return pos + 1;
}
function incw(pos) {
    return pos + 2;
}
function incl(pos) {
    return pos + 4;
}

startDecompression(0x7C974);