import fs from 'fs';
import path from 'path';
// const fs = require('fs');          // only needed in Node.js
// const path = require('path');

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
    // For register-to-register MOVE.L: usually 2 bytes
    // For MOVE.W: 2 bytes
    // (if src is immediate: 4 or 6 bytes — but here it's reg→reg)
    advancePC(2);

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

    console.log(`[MOVE.${size}] ${dstReg === d0 ? 'd0' : 'other'} = 0x${value.toString(16).padStart(8, '0')}`);
}

// ────────────────────────────────────────────────────────────────
// MOVEA  src, An    (only to address registers)
// ────────────────────────────────────────────────────────────────
function MOVEA(srcValue, dstAn, size = 'l') {
    if (size === 'b') {
    console.error("MOVEA .b is illegal");
    return;
    }

    // Detect if srcValue is an immediate (constant) or a register
    // If it matches any register value, it's register-to-register (2 bytes)
    // Otherwise, it's an immediate (2 + immediate size bytes)
    const isImmediate = !(srcValue === a0 || srcValue === a1 || srcValue === a2 || srcValue === a3 ||
                          srcValue === a4 || srcValue === a5 || srcValue === a6 || srcValue === a7 ||
                          srcValue === d0 || srcValue === d1 || srcValue === d2 || srcValue === d3 ||
                          srcValue === d4 || srcValue === d5 || srcValue === d6 || srcValue === d7);

    if (isImmediate) {
        // Immediate addressing: opcode (2) + immediate value
        const immBytes = size === 'w' ? 2 : 4;
        advancePC(2 + immBytes);
    } else {
        // Register-to-register: just opcode (2 bytes)
        advancePC(2);
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
    console.log(`[MOVEA.${size}] ${dstAn === a0 ? 'a0' : 'other'} = 0x${value.toString(16).padStart(8, '0')}`);
}

// ────────────────────────────────────────────────────────────────
// ASL   #count / reg, Dn    (shift left, destination must be data reg)
// ────────────────────────────────────────────────────────────────
function ASL(count, dstReg, size = 'l') {
    // ASL #imm, Dn is usually 4 bytes (opcode 2 + imm/reg field)
    advancePC(2);
    
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
// andi.<size> #immValue, register   → AND Immediate with register
// Parameters:
//   - immValue: Immediate value (e.g. 0x7FFF)
//   - register: The register to operate on (e.g. d0)
//   - size: Optional ('b', 'w', 'l') — defaults to 'w'
// ────────────────────────────────────────────────────────────────
function ANDI(immValue, register, size = 'w') {
  // Opcode + immediate size (2 + 2 or 4 bytes)
  const immBytes = size === 'l' ? 4 : 2;
  advancePC(2 + immBytes);

  // Identify which register by comparing value
  let currentValue;
  let isD0 = false, isD1 = false, isD2 = false, isD3 = false;
  let isD4 = false, isD5 = false, isD6 = false, isD7 = false;
  
  if (register === d0) { currentValue = d0; isD0 = true; }
  else if (register === d1) { currentValue = d1; isD1 = true; }
  else if (register === d2) { currentValue = d2; isD2 = true; }
  else if (register === d3) { currentValue = d3; isD3 = true; }
  else if (register === d4) { currentValue = d4; isD4 = true; }
  else if (register === d5) { currentValue = d5; isD5 = true; }
  else if (register === d6) { currentValue = d6; isD6 = true; }
  else if (register === d7) { currentValue = d7; isD7 = true; }
  else {
    console.warn("ANDI: Only data registers (d0-d7) supported");
    return;
  }

  // Mask immediate to size
  const immMask = MASK[size];
  const maskedImm = immValue & immMask;

  // Perform AND
  const result = (currentValue & maskedImm) & immMask;

  // Write back to the correct register
  if (isD0) d0 = result;
  else if (isD1) d1 = result;
  else if (isD2) d2 = result;
  else if (isD3) d3 = result;
  else if (isD4) d4 = result;
  else if (isD5) d5 = result;
  else if (isD6) d6 = result;
  else if (isD7) d7 = result;

  // Update flags (AND affects N, Z, V=0, C=0)
  const negative = (result & SIGN_BIT[size]) !== 0;
  const zero = result === 0;

  CCR.N = negative;
  CCR.Z = zero;
  CCR.V = false;
  CCR.C = false;
  // X unchanged

  console.log(`[ANDI.${size} #$${immValue.toString(16).padStart(4,'0')},${isD0 ? 'd0' : isD1 ? 'd1' : isD2 ? 'd2' : isD3 ? 'd3' : isD4 ? 'd4' : isD5 ? 'd5' : isD6 ? 'd6' : isD7 ? 'd7' : 'reg'}] result = 0x${result.toString(16).padStart(8, '0')} (N=${CCR.N ? 1 : 0}, Z=${CCR.Z ? 1 : 0})`);
}

// ────────────────────────────────────────────────────────────────
// add.<size> srcReg, destReg   → Add srcReg to destReg
// Parameters:
//   - srcReg: Source register (e.g. d0)
//   - destReg: Destination register (e.g. d4)
//   - size: Optional ('b', 'w', 'l') — defaults to 'w'
// ────────────────────────────────────────────────────────────────
function ADD(srcReg, destReg, size = 'w') {
  advancePC(2); // add.<size> Dn,Dm is 2 bytes

  // Get source value
  let srcValue;
  if (srcReg === d0) srcValue = d0;
  else if (srcReg === d1) srcValue = d1;
  else if (srcReg === d2) srcValue = d2;
  else if (srcReg === d3) srcValue = d3;
  else if (srcReg === d4) srcValue = d4;
  else if (srcReg === d5) srcValue = d5;
  else if (srcReg === d6) srcValue = d6;
  else if (srcReg === d7) srcValue = d7;
  else {
    console.warn("ADD: Source must be data register");
    return;
  }

  // Get destination value and identify which register
  let dstBefore;
  let isD0 = false, isD1 = false, isD2 = false, isD3 = false;
  let isD4 = false, isD5 = false, isD6 = false, isD7 = false;
  
  if (destReg === d0) { dstBefore = d0; isD0 = true; }
  else if (destReg === d1) { dstBefore = d1; isD1 = true; }
  else if (destReg === d2) { dstBefore = d2; isD2 = true; }
  else if (destReg === d3) { dstBefore = d3; isD3 = true; }
  else if (destReg === d4) { dstBefore = d4; isD4 = true; }
  else if (destReg === d5) { dstBefore = d5; isD5 = true; }
  else if (destReg === d6) { dstBefore = d6; isD6 = true; }
  else if (destReg === d7) { dstBefore = d7; isD7 = true; }
  else {
    console.warn("ADD: Destination must be data register");
    return;
  }

  // Mask to size
  const mask = MASK[size];
  const src = srcValue & mask;
  const dstMasked = dstBefore & mask;

  // Perform addition
  const result = (dstMasked + src) & mask;

  // Write back (preserve upper bits if size < 'l')
  const finalValue = (dstBefore & ~mask) | result;
  if (isD0) d0 = finalValue;
  else if (isD1) d1 = finalValue;
  else if (isD2) d2 = finalValue;
  else if (isD3) d3 = finalValue;
  else if (isD4) d4 = finalValue;
  else if (isD5) d5 = finalValue;
  else if (isD6) d6 = finalValue;
  else if (isD7) d7 = finalValue;

  // Update flags
  const negative = (result & SIGN_BIT[size]) !== 0;
  const zero = result === 0;
  const overflow = ((dstMasked ^ result) & ~(dstMasked ^ src) & SIGN_BIT[size]) !== 0;
  const carry = (dstMasked + src) > mask;

  CCR.N = negative;
  CCR.Z = zero;
  CCR.V = overflow;
  CCR.C = carry;
  CCR.X = carry; // X gets same as C for ADD

  const regName = isD0 ? 'd0' : isD1 ? 'd1' : isD2 ? 'd2' : isD3 ? 'd3' : isD4 ? 'd4' : isD5 ? 'd5' : isD6 ? 'd6' : isD7 ? 'd7' : 'dest';
  console.log(`[ADD.${size} ${srcReg === d0 ? 'd0' : 'src'},${regName}] result = 0x${finalValue.toString(16).padStart(8, '0')} (N=${CCR.N ? 1 : 0}, Z=${CCR.Z ? 1 : 0}, V=${CCR.V ? 1 : 0}, C=${CCR.C ? 1 : 0}, X=${CCR.X ? 1 : 0})`);
}

// ────────────────────────────────────────────────────────────────
// bsr.<size> label   → Branch Subroutine
// Parameters:
//   - targetCallback: The function to call (subroutine)
//   - size: Optional ('s', 'w', 'l') — defaults to 'w'
// ────────────────────────────────────────────────────────────────
function BSR(targetCallback, size = 'w') {
  // Size affects displacement bytes
  const pcAdvance = size === 's' ? 2 : size === 'w' ? 4 : 6;
  advancePC(pcAdvance);

  // Push current PC (return address) onto stack (always 4 bytes for 68k)
  a7 -= 4;
  memory[a7 + 0] = (pc >>> 24) & 0xFF;
  memory[a7 + 1] = (pc >>> 16) & 0xFF;
  memory[a7 + 2] = (pc >>>  8) & 0xFF;
  memory[a7 + 3] = (pc >>>  0) & 0xFF;

  console.log(`[BSR.${size}] Pushed return address 0x${pc.toString(16).padStart(8, '0')} to stack at 0x${a7.toString(16).padStart(8, '0')}`);

  // Call the target subroutine
  targetCallback();
}

// Global Program Counter (starts at 0 or ROM entry point)
let pc = 0x00000000;  // We'll set this later to the reset vector

// Helper to advance PC past the current instruction (for when branch NOT taken)
function advancePC(bytes) {
  // Opcode is 2 bytes + displacement
  // .s = byte displacement → +2 bytes total
  // .w = word displacement → +4 bytes total
  // .l = long displacement → +6 bytes total (rare for Bcc)
//   const advance = size === 's' ? 2 : size === 'w' ? 4 : 6;
  pc += bytes;
  console.log(`[PC] Advanced to 0x${pc.toString(16).padStart(8, '0')}`);
}

function jumpTo(address) {
  pc = address;
  console.log(`[PC] Jumping to 0x${pc.toString(16).padStart(8, '0')}`);
}

// ────────────────────────────────────────────────────────────────
// MOVEM register list constants (for passing to MOVEM_TO_SP)
// These represent common ranges like "d0-d1/a0-a6" from your ROM
// Each is a 16-bit mask where:
//   bits 0-7  = D0 to D7
//   bits 8-15 = A0 to A7
// ────────────────────────────────────────────────────────────────

// Data registers only
const D0_D7      = 0x00FF;  // All D0–D7
const D0_D1      = 0x0003;  // D0–D1
const D2_D7      = 0x00FC;  // D2–D7
const D0_D3      = 0x000F;  // D0–D3

// Address registers only
const A0_A7      = 0xFF00;  // All A0–A7
const A0_A6      = 0x7F00;  // A0–A6 (excludes A7/SP)
const A0_A3      = 0x0F00;  // A0–A3
const A4_A6      = 0x7000;  // A4–A6

// Mixed data + address (most common in prologues/epilogues)
const D0_D1_A0_A6   = 0x7F03;  // D0–D1 + A0–A6 (exactly your ROM instruction!)
const D0_D7_A0_A6   = 0xFF03;  // All D0–D7 + A0–A6
const D2_D7_A0_A6   = 0xFFFC;  // D2–D7 + A0–A6
const D0_D3_A0_A3   = 0x0F0F;  // D0–D3 + A0–A3
const D0_D3_A0_A2   = 0x070F;  // D0–D3 + A0–A2
const D0_D1_A0_A1   = 0x0303;  // D0–D1 + A0–A1

// Full save/restore (all caller-saved regs)
const FULL_SAVE  = 0xFFFF;  // D0–D7 + A0–A7 (rare, includes SP)

// ────────────────────────────────────────────────────────────────
// MOVEM   registers, -(sp)    → Push multiple registers to stack
// Correct 68k pre-decrement behavior: pushes HIGHEST register FIRST
// ────────────────────────────────────────────────────────────────
function MOVEM_TO_SP(maskOrList, size = 'l') {
  advancePC(4);

  const bytesNeeded = 36; // 9 longs
  if (a7 < bytesNeeded) {
    console.error(`[STACK ERROR] Not enough stack space! a7=0x${a7.toString(16)}`);
    return;
  }

  const bytesPerReg = size === 'b' ? 1 : size === 'w' ? 2 : 4;

  let registersToPush = [];

  if (typeof maskOrList === 'number') {
    const mask = maskOrList;

    // Collect ALL selected registers in NORMAL order: D0→D7, A0→A7
    // Then REVERSE the list so highest is pushed first

    // Data registers D0-D7
    for (let i = 0; i < 8; i++) {
      if (mask & (1 << i)) {
        const value = [d0, d1, d2, d3, d4, d5, d6, d7][i];
        registersToPush.push({ value, name: `d${i}` });
      }
    }

    // Address registers A0-A7
    for (let i = 0; i < 8; i++) {
      if (mask & (1 << (i + 8))) {
        const value = [a0, a1, a2, a3, a4, a5, a6, a7][i];
        registersToPush.push({ value, name: `a${i}` });
      }
    }

    // REVERSE the array so highest register is pushed first
    registersToPush.reverse();
  } else {
    console.error("MOVEM_TO_SP: Only mask number supported");
    return;
  }

  // Now push in the reversed order (highest reg first)
  registersToPush.forEach(({ value, name }) => {
    a7 -= bytesPerReg;

    if (size === 'l') {
      memory[a7 + 0] = (value >>> 24) & 0xFF;
      memory[a7 + 1] = (value >>> 16) & 0xFF;
      memory[a7 + 2] = (value >>>  8) & 0xFF;
      memory[a7 + 3] = (value >>>  0) & 0xFF;
    } else if (size === 'w') {
      memory[a7 + 0] = (value >>>  8) & 0xFF;
      memory[a7 + 1] = (value >>>  0) & 0xFF;
    } else if (size === 'b') {
      memory[a7 + 0] = value & 0xFF;
    }

    console.log(`[MOVEM.${size}] Pushed ${name} = 0x${value.toString(16).padStart(8, '0')} to 0x${a7.toString(16).padStart(8, '0')}`);
  });

  console.log(`[MOVEM.${size}] Flags unchanged`);
}

// ────────────────────────────────────────────────────────────────
// Debugging: Dump current stack contents (from SP upward)
// ────────────────────────────────────────────────────────────────
function dumpStack(numEntries = 10) {
  console.log(`[STACK DUMP] Current SP (A7) = 0x${a7.toString(16).padStart(8, '0')}`);
  console.log("Stack (from SP upward, showing longwords):");

  for (let i = 0; i < numEntries; i++) {
    const addr = a7 + (i * 4);
    if (addr >= MEMORY_SIZE) break;

    const val = readl(addr);  // Use your existing readl() function
    console.log(`  0x${addr.toString(16).padStart(8, '0')}: 0x${val.toString(16).padStart(8, '0')}`);
  }

  console.log("────────────────────────────────────────");
}

// ────────────────────────────────────────────────────────────────
// BEQ   Branch if Equal (Z == 1)
// ────────────────────────────────────────────────────────────────
function BEQ(targetAddr, size = 'w') {
  // Opcode is 2 bytes, displacement size depends on size parameter
  const dispBytes = size === 's' ? 1 : size === 'w' ? 2 : 4;
  advancePC(2 + dispBytes);
  
  if (CCR.Z) {
    console.log(`[BEQ.${size}] Branch TAKEN (Z=1) to 0x${targetAddr.toString(16).padStart(8, '0')}`);
    jumpTo(targetAddr);
    executeAtAddress(targetAddr);
    return true; // Indicates branch was taken
  } else {
    console.log(`[BEQ.${size}] Branch NOT taken`);
    // PC already advanced above
    return false; // Indicates branch was not taken
  }
}

// ────────────────────────────────────────────────────────────────
// BMI   Branch if Minus (N == 1)
// ────────────────────────────────────────────────────────────────
function BMI(targetAddr, size = 'w') {
  // Opcode is 2 bytes, displacement size depends on size parameter
  const dispBytes = size === 's' ? 1 : size === 'w' ? 2 : 4;
  advancePC(2 + dispBytes);
  
  if (CCR.N) {
    console.log(`[BMI.${size}] Branch TAKEN (N=1) to 0x${targetAddr.toString(16).padStart(8, '0')}`);
    jumpTo(targetAddr);
    executeAtAddress(targetAddr);
  } else {
    console.log(`[BMI.${size}] Branch NOT taken`);
    // PC already advanced above
  }
}

// ────────────────────────────────────────────────────────────────
// LSR   Logical Shift Right
// ────────────────────────────────────────────────────────────────
function LSR(count, dstReg, size = 'w') {
  advancePC(2);
  
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
    console.warn("LSR: destination must be D0–D7");
    return;
  }

  const mask = MASK[size];
  const bits = BIT_WIDTH[size];
  value &= mask;

  if (count >= bits) {
    const result = 0;
    if (dstReg === d0) d0 = result;
    else if (dstReg === d1) d1 = result;
    else if (dstReg === d2) d2 = result;
    else if (dstReg === d3) d3 = result;
    else if (dstReg === d4) d4 = result;
    else if (dstReg === d5) d5 = result;
    else if (dstReg === d6) d6 = result;
    else if (dstReg === d7) d7 = result;
    
    CCR.N = false;
    CCR.Z = true;
    CCR.C = false;
    CCR.X = false;
    return;
  }

  if (count === 0) {
    const neg = (value & SIGN_BIT[size]) !== 0;
    CCR.N = neg;
    CCR.Z = value === 0;
    CCR.C = false;
    return;
  }

  const result = (value >>> count) & mask;
  const carry = ((value >>> (count - 1)) & 1) !== 0;

  if (dstReg === d0) d0 = result;
  else if (dstReg === d1) d1 = result;
  else if (dstReg === d2) d2 = result;
  else if (dstReg === d3) d3 = result;
  else if (dstReg === d4) d4 = result;
  else if (dstReg === d5) d5 = result;
  else if (dstReg === d6) d6 = result;
  else if (dstReg === d7) d7 = result;

  CCR.N = (result & SIGN_BIT[size]) !== 0;
  CCR.Z = result === 0;
  CCR.C = carry;
  CCR.X = carry;
}

// ────────────────────────────────────────────────────────────────
// ROXL  Rotate Left with Extend
// ────────────────────────────────────────────────────────────────
function ROXL(count, dstReg, size = 'b') {
  advancePC(2);
  
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
    console.warn("ROXL: destination must be D0–D7");
    return;
  }

  const mask = MASK[size];
  const bits = BIT_WIDTH[size];
  value &= mask;

  if (count === 0) {
    const neg = (value & SIGN_BIT[size]) !== 0;
    CCR.N = neg;
    CCR.Z = value === 0;
    return;
  }

  let result = value;
  for (let i = 0; i < count; i++) {
    const oldX = CCR.X ? 1 : 0;
    const msb = (result & SIGN_BIT[size]) !== 0;
    result = ((result << 1) & mask) | oldX;
    CCR.X = msb;
    CCR.C = msb;
  }

  if (dstReg === d0) d0 = result;
  else if (dstReg === d1) d1 = result;
  else if (dstReg === d2) d2 = result;
  else if (dstReg === d3) d3 = result;
  else if (dstReg === d4) d4 = result;
  else if (dstReg === d5) d5 = result;
  else if (dstReg === d6) d6 = result;
  else if (dstReg === d7) d7 = result;

  CCR.N = (result & SIGN_BIT[size]) !== 0;
  CCR.Z = result === 0;
  CCR.V = false;
}

// ────────────────────────────────────────────────────────────────
// SUBQ  Subtract Quick (immediate 1-7)
// ────────────────────────────────────────────────────────────────
function SUBQ(imm, dstReg, size = 'b') {
  advancePC(2);
  
  if (imm < 1 || imm > 7) {
    console.warn("SUBQ: immediate must be 1-7");
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
  else if (dstReg === a0) value = a0;
  else if (dstReg === a1) value = a1;
  else if (dstReg === a2) value = a2;
  else if (dstReg === a3) value = a3;
  else if (dstReg === a4) value = a4;
  else if (dstReg === a5) value = a5;
  else if (dstReg === a6) value = a6;
  else if (dstReg === a7) value = a7;
  else {
    console.warn("SUBQ: unsupported register");
    return;
  }

  const mask = MASK[size];
  const dstBefore = value & mask;
  const result = (dstBefore - imm) & mask;

  if (dstReg === d0) d0 = result;
  else if (dstReg === d1) d1 = result;
  else if (dstReg === d2) d2 = result;
  else if (dstReg === d3) d3 = result;
  else if (dstReg === d4) d4 = result;
  else if (dstReg === d5) d5 = result;
  else if (dstReg === d6) d6 = result;
  else if (dstReg === d7) d7 = result;
  else if (dstReg === a0) a0 = result;
  else if (dstReg === a1) a1 = result;
  else if (dstReg === a2) a2 = result;
  else if (dstReg === a3) a3 = result;
  else if (dstReg === a4) a4 = result;
  else if (dstReg === a5) a5 = result;
  else if (dstReg === a6) a6 = result;
  else if (dstReg === a7) a7 = result;

  if (size !== 'l' || (dstReg >= d0 && dstReg <= d7)) {
    const negative = (result & SIGN_BIT[size]) !== 0;
    const zero = result === 0;
    const overflow = ((dstBefore ^ result) & (imm ^ result) & SIGN_BIT[size]) !== 0;
    const carry = dstBefore < imm;

    CCR.N = negative;
    CCR.Z = zero;
    CCR.V = overflow;
    CCR.C = carry;
    CCR.X = carry;
  }
}

// ────────────────────────────────────────────────────────────────
// ADDQ  Add Quick (immediate 1-7)
// ────────────────────────────────────────────────────────────────
function ADDQ(imm, dstReg, size = 'b') {
  advancePC(2);
  
  if (imm < 1 || imm > 7) {
    console.warn("ADDQ: immediate must be 1-7");
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
  else if (dstReg === a0) value = a0;
  else if (dstReg === a1) value = a1;
  else if (dstReg === a2) value = a2;
  else if (dstReg === a3) value = a3;
  else if (dstReg === a4) value = a4;
  else if (dstReg === a5) value = a5;
  else if (dstReg === a6) value = a6;
  else if (dstReg === a7) value = a7;
  else {
    console.warn("ADDQ: unsupported register");
    return;
  }

  const mask = MASK[size];
  const dstBefore = value & mask;
  const result = (dstBefore + imm) & mask;

  if (dstReg === d0) d0 = result;
  else if (dstReg === d1) d1 = result;
  else if (dstReg === d2) d2 = result;
  else if (dstReg === d3) d3 = result;
  else if (dstReg === d4) d4 = result;
  else if (dstReg === d5) d5 = result;
  else if (dstReg === d6) d6 = result;
  else if (dstReg === d7) d7 = result;
  else if (dstReg === a0) a0 = result;
  else if (dstReg === a1) a1 = result;
  else if (dstReg === a2) a2 = result;
  else if (dstReg === a3) a3 = result;
  else if (dstReg === a4) a4 = result;
  else if (dstReg === a5) a5 = result;
  else if (dstReg === a6) a6 = result;
  else if (dstReg === a7) a7 = result;

  if (size !== 'l' || (dstReg >= d0 && dstReg <= d7)) {
    const negative = (result & SIGN_BIT[size]) !== 0;
    const zero = result === 0;
    const overflow = ((dstBefore ^ result) & ~(dstBefore ^ imm) & SIGN_BIT[size]) !== 0;
    const carry = (dstBefore + imm) > mask;

    CCR.N = negative;
    CCR.Z = zero;
    CCR.V = overflow;
    CCR.C = carry;
    CCR.X = carry;
  }
}

// ────────────────────────────────────────────────────────────────
// CLR   Clear register
// ────────────────────────────────────────────────────────────────
function CLR(dstReg, size = 'w') {
  advancePC(2);
  
  const result = 0;
  
  if (dstReg === d0) d0 = result;
  else if (dstReg === d1) d1 = result;
  else if (dstReg === d2) d2 = result;
  else if (dstReg === d3) d3 = result;
  else if (dstReg === d4) d4 = result;
  else if (dstReg === d5) d5 = result;
  else if (dstReg === d6) d6 = result;
  else if (dstReg === d7) d7 = result;
  else {
    console.warn("CLR: destination must be D0–D7");
    return;
  }

  CCR.N = false;
  CCR.Z = true;
  CCR.V = false;
  CCR.C = false;
}

// ────────────────────────────────────────────────────────────────
// NEG   Negate (two's complement)
// ────────────────────────────────────────────────────────────────
function NEG(dstReg, size = 'b') {
  advancePC(2);
  
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
    console.warn("NEG: destination must be D0–D7");
    return;
  }

  const mask = MASK[size];
  value &= mask;
  const result = (-value) & mask;

  if (dstReg === d0) d0 = result;
  else if (dstReg === d1) d1 = result;
  else if (dstReg === d2) d2 = result;
  else if (dstReg === d3) d3 = result;
  else if (dstReg === d4) d4 = result;
  else if (dstReg === d5) d5 = result;
  else if (dstReg === d6) d6 = result;
  else if (dstReg === d7) d7 = result;

  const negative = (result & SIGN_BIT[size]) !== 0;
  const zero = result === 0;
  const overflow = value === SIGN_BIT[size]; // -128/-32768/-2147483648
  const carry = value !== 0;

  CCR.N = negative;
  CCR.Z = zero;
  CCR.V = overflow;
  CCR.C = carry;
  CCR.X = carry;
}

// ────────────────────────────────────────────────────────────────
// TST   Test (set flags without storing)
// ────────────────────────────────────────────────────────────────
function TST(src, size = 'w') {
    advancePC(2);
    
    let value;
    let isMemory = false;
    
    // Check if it's an address register (memory indirect)
    if (src === a0 || src === a1 || src === a2 || src === a3 || 
        src === a4 || src === a5 || src === a6 || src === a7) {
        isMemory = true;
        const addr = src;
        if (size === 'l') {
            value = readl(addr);
        } else if (size === 'w') {
            value = readw(addr);
        } else {
            value = readb(addr);
        }
    } 
    // Otherwise it's a data register
    else if (src === d0) value = d0;
    else if (src === d1) value = d1;
    else if (src === d2) value = d2;
    else if (src === d3) value = d3;
    else if (src === d4) value = d4;
    else if (src === d5) value = d5;
    else if (src === d6) value = d6;
    else if (src === d7) value = d7;
    else {
        console.warn("TST: source must be D0–D7 or A0–A7");
        return;
    }
    
    const mask = MASK[size];
    value &= mask;
    
    CCR.N = (value & SIGN_BIT[size]) !== 0;
    CCR.Z = value === 0;
    CCR.V = false;
    CCR.C = false;
}

// ────────────────────────────────────────────────────────────────
// DBF   Decrement and Branch if False (d0 = d0 - 1, branch if d0 != -1)
// ────────────────────────────────────────────────────────────────
function DBF(counterReg, targetCallback) {
  advancePC(2);
  
  let value;
  if (counterReg === d0) value = d0;
  else if (counterReg === d1) value = d1;
  else if (counterReg === d2) value = d2;
  else if (counterReg === d3) value = d3;
  else if (counterReg === d4) value = d4;
  else if (counterReg === d5) value = d5;
  else if (counterReg === d6) value = d6;
  else if (counterReg === d7) value = d7;
  else {
    console.warn("DBF: counter must be D0–D7");
    return;
  }

  value = (value - 1) & 0xFFFF;
  
  if (counterReg === d0) d0 = value;
  else if (counterReg === d1) d1 = value;
  else if (counterReg === d2) d2 = value;
  else if (counterReg === d3) d3 = value;
  else if (counterReg === d4) d4 = value;
  else if (counterReg === d5) d5 = value;
  else if (counterReg === d6) d6 = value;
  else if (counterReg === d7) d7 = value;

  if (value !== 0xFFFF) {
    targetCallback();
  }
}

// ────────────────────────────────────────────────────────────────
// JSR   Jump to Subroutine
// ────────────────────────────────────────────────────────────────
// Usage:
//   JSR(targetAddr) - Direct address: jsr $D642
//   JSR(baseAn) - Register indirect: jsr (a6)
//   JSR(baseAn, indexDn, size) - Indexed: jsr (a2,d0.w)
function JSR(targetAddrOrBase, indexDn = null, size = null) {
  advancePC(2);
  
  // Push return address (PC) onto stack
  a7 -= 4;
  memory[a7 + 0] = (pc >>> 24) & 0xFF;
  memory[a7 + 1] = (pc >>> 16) & 0xFF;
  memory[a7 + 2] = (pc >>>  8) & 0xFF;
  memory[a7 + 3] = (pc >>>  0) & 0xFF;
  
  let targetAddr;
  
  // Check if this is indexed addressing (jsr (An,Dn.w))
  if (indexDn !== null && size !== null) {
    // Indexed addressing: jsr (baseAn,indexDn.size)
    let baseAddr;
    if (targetAddrOrBase === a0) baseAddr = a0;
    else if (targetAddrOrBase === a1) baseAddr = a1;
    else if (targetAddrOrBase === a2) baseAddr = a2;
    else if (targetAddrOrBase === a3) baseAddr = a3;
    else if (targetAddrOrBase === a4) baseAddr = a4;
    else if (targetAddrOrBase === a5) baseAddr = a5;
    else if (targetAddrOrBase === a6) baseAddr = a6;
    else if (targetAddrOrBase === a7) baseAddr = a7;
    else {
      console.warn("JSR: base must be A0–A7 for indexed addressing");
      return;
    }
    
    let index;
    if (indexDn === d0) index = d0;
    else if (indexDn === d1) index = d1;
    else if (indexDn === d2) index = d2;
    else if (indexDn === d3) index = d3;
    else if (indexDn === d4) index = d4;
    else if (indexDn === d5) index = d5;
    else if (indexDn === d6) index = d6;
    else if (indexDn === d7) index = d7;
    else {
      console.warn("JSR: index must be D0–D7 for indexed addressing");
      return;
    }
    
    // Calculate target address: base + index (sign-extended based on size)
    const mask = MASK[size];
    const indexMasked = index & mask;
    // Sign extend if needed
    let indexValue = indexMasked;
    if (size === 'w' && (indexMasked & 0x8000)) {
      indexValue = indexMasked | 0xFFFF0000; // Sign extend word
    } else if (size === 'b' && (indexMasked & 0x80)) {
      indexValue = indexMasked | 0xFFFFFF00; // Sign extend byte
    }
    
    targetAddr = (baseAddr + indexValue) & 0xFFFFFFFF;
  } else if (targetAddrOrBase === a0 || targetAddrOrBase === a1 || targetAddrOrBase === a2 ||
             targetAddrOrBase === a3 || targetAddrOrBase === a4 || targetAddrOrBase === a5 ||
             targetAddrOrBase === a6 || targetAddrOrBase === a7) {
    // Register indirect addressing: jsr (An)
    targetAddr = targetAddrOrBase;
  } else {
    // Direct addressing: jsr $address
    targetAddr = targetAddrOrBase;
  }
  
  jumpTo(targetAddr);
  
  // Execute code at target address
  const result = executeAtAddress(targetAddr);
  if (result === 'end') {
    return 'end';
  }
}

// ────────────────────────────────────────────────────────────────
// LEA   Load Effective Address
// ────────────────────────────────────────────────────────────────
function LEA(srcAddr, dstAn) {
  advancePC(4);
  
  if (dstAn === a0) a0 = srcAddr;
  else if (dstAn === a1) a1 = srcAddr;
  else if (dstAn === a2) a2 = srcAddr;
  else if (dstAn === a3) a3 = srcAddr;
  else if (dstAn === a4) a4 = srcAddr;
  else if (dstAn === a5) a5 = srcAddr;
  else if (dstAn === a6) a6 = srcAddr;
  else if (dstAn === a7) a7 = srcAddr;
  else {
    console.warn("LEA: destination must be A0–A7");
    return;
  }
}

// ────────────────────────────────────────────────────────────────
// PEA   Push Effective Address onto stack
// ────────────────────────────────────────────────────────────────
function PEA(targetAddr) {
  advancePC(4);
  
  // Push 32-bit address onto stack
  a7 -= 4;
  memory[a7 + 0] = (targetAddr >>> 24) & 0xFF;
  memory[a7 + 1] = (targetAddr >>> 16) & 0xFF;
  memory[a7 + 2] = (targetAddr >>>  8) & 0xFF;
  memory[a7 + 3] = (targetAddr >>>  0) & 0xFF;
  
  console.log(`[PEA] Pushed address 0x${targetAddr.toString(16).padStart(8, '0')} to stack at 0x${a7.toString(16).padStart(8, '0')}`);
}

// ────────────────────────────────────────────────────────────────
// move.<size> (An,Dn.w),Dm  → Read from indexed address to register
// ────────────────────────────────────────────────────────────────
function MOVEDATAINDEXED_TO_REG(baseAn, indexDn, dstDn, size = 'w') {
  advancePC(4);
  
  let baseAddr;
  if (baseAn === a0) baseAddr = a0;
  else if (baseAn === a1) baseAddr = a1;
  else if (baseAn === a2) baseAddr = a2;
  else if (baseAn === a3) baseAddr = a3;
  else if (baseAn === a4) baseAddr = a4;
  else if (baseAn === a5) baseAddr = a5;
  else if (baseAn === a6) baseAddr = a6;
  else if (baseAn === a7) baseAddr = a7;
  else {
    console.warn("MOVEDATAINDEXED_TO_REG: base must be A0–A7");
    return;
  }
  
  let index;
  if (indexDn === d0) index = d0;
  else if (indexDn === d1) index = d1;
  else if (indexDn === d2) index = d2;
  else if (indexDn === d3) index = d3;
  else if (indexDn === d4) index = d4;
  else if (indexDn === d5) index = d5;
  else if (indexDn === d6) index = d6;
  else if (indexDn === d7) index = d7;
  else {
    console.warn("MOVEDATAINDEXED_TO_REG: index must be D0–D7");
    return;
  }
  
  const srcAddr = (baseAddr + (index & 0xFFFF)) & 0xFFFFFFFF;
  
  let value;
  if (size === 'b') {
    value = memory[srcAddr & 0xFFFFFFFF];
  } else if (size === 'w') {
    value = (memory[srcAddr & 0xFFFFFFFF] << 8) | memory[(srcAddr + 1) & 0xFFFFFFFF];
  } else {
    value = readl(srcAddr);
  }
  
  const mask = MASK[size];
  value &= mask;
  
  if (dstDn === d0) d0 = value;
  else if (dstDn === d1) d1 = value;
  else if (dstDn === d2) d2 = value;
  else if (dstDn === d3) d3 = value;
  else if (dstDn === d4) d4 = value;
  else if (dstDn === d5) d5 = value;
  else if (dstDn === d6) d6 = value;
  else if (dstDn === d7) d7 = value;
  else {
    console.warn("MOVEDATAINDEXED_TO_REG: destination must be D0–D7");
    return;
  }
  
  // Update flags
  const negative = (value & SIGN_BIT[size]) !== 0;
  const zero = value === 0;
  CCR.N = negative;
  CCR.Z = zero;
  CCR.V = false;
  CCR.C = false;
}

// ────────────────────────────────────────────────────────────────
// BNE   Branch if Not Equal (Z == 0)
// ────────────────────────────────────────────────────────────────
function BNE(targetAddr, size = 'w') {
  // Opcode is 2 bytes, displacement size depends on size parameter
  const dispBytes = size === 's' ? 1 : size === 'w' ? 2 : 4;
  advancePC(2 + dispBytes);
  
  if (!CCR.Z) {
    console.log(`[BNE.${size}] Branch TAKEN (Z=0) to 0x${targetAddr.toString(16).padStart(8, '0')}`);
    jumpTo(targetAddr);
    executeAtAddress(targetAddr);
  } else {
    console.log(`[BNE.${size}] Branch NOT taken`);
    // PC already advanced above
  }
}

// ────────────────────────────────────────────────────────────────
// BRA   Branch Always
// ────────────────────────────────────────────────────────────────
function BRA(targetAddr, size = 's') {
  // Opcode is 2 bytes, displacement size depends on size parameter
  const dispBytes = size === 's' ? 1 : size === 'w' ? 2 : 4;
  advancePC(2 + dispBytes);
  
  console.log(`[BRA.${size}] Branch always to 0x${targetAddr.toString(16).padStart(8, '0')}`);
  jumpTo(targetAddr);
  executeAtAddress(targetAddr);
  return true; // Always branches
}

// ────────────────────────────────────────────────────────────────
// move.b -1(An),Dn  → Read byte from address register - 1
// ────────────────────────────────────────────────────────────────
function MOVEDATAPREDEC(srcAn, dstDn, size = 'b') {
    advancePC(2);
    
    let addr;
    if (srcAn === a0) addr = (a0 - 1) & 0xFFFFFFFF;
    else if (srcAn === a1) addr = (a1 - 1) & 0xFFFFFFFF;
    else if (srcAn === a2) addr = (a2 - 1) & 0xFFFFFFFF;
    else if (srcAn === a3) addr = (a3 - 1) & 0xFFFFFFFF;
    else if (srcAn === a4) addr = (a4 - 1) & 0xFFFFFFFF;
    else if (srcAn === a5) addr = (a5 - 1) & 0xFFFFFFFF;
    else if (srcAn === a6) addr = (a6 - 1) & 0xFFFFFFFF;
    else if (srcAn === a7) addr = (a7 - 1) & 0xFFFFFFFF;
    else {
        console.warn("MOVEDATAPREDEC: source must be A0–A7");
        return;
    }
    
    const value = memory[addr & 0xFFFFFFFF];
    
    if (dstDn === d0) d0 = value;
    else if (dstDn === d1) d1 = value;
    else if (dstDn === d2) d2 = value;
    else if (dstDn === d3) d3 = value;
    else if (dstDn === d4) d4 = value;
    else if (dstDn === d5) d5 = value;
    else if (dstDn === d6) d6 = value;
    else if (dstDn === d7) d7 = value;
    else {
        console.warn("MOVEDATAPREDEC: destination must be D0–D7");
        return;
    }
    
    // Update flags
    const negative = (value & 0x80) !== 0;
    const zero = value === 0;
    CCR.N = negative;
    CCR.Z = zero;
    CCR.V = false;
    CCR.C = false;
}

// ────────────────────────────────────────────────────────────────
// move.<size> (An)+,Dn  → Read from address register and increment
// ────────────────────────────────────────────────────────────────
function MOVEDATAINC(srcAn, dstDn, size = 'b') {
    advancePC(2);
    
    let addr;
    if (srcAn === a0) addr = a0;
    else if (srcAn === a1) addr = a1;
    else if (srcAn === a2) addr = a2;
    else if (srcAn === a3) addr = a3;
    else if (srcAn === a4) addr = a4;
    else if (srcAn === a5) addr = a5;
    else if (srcAn === a6) addr = a6;
    else if (srcAn === a7) addr = a7;
    else {
        console.warn("MOVEDATAINC: source must be A0–A7");
        return;
    }
    
    let value;
    const bytesPerReg = size === 'b' ? 1 : size === 'w' ? 2 : 4;
    
    if (size === 'b') {
        value = memory[addr & 0xFFFFFFFF];
    } else if (size === 'w') {
        value = (memory[addr & 0xFFFFFFFF] << 8) | memory[(addr + 1) & 0xFFFFFFFF];
    } else {
        value = readl(addr);
    }
    
    // Post-increment
    if (srcAn === a0) a0 = (a0 + bytesPerReg) & 0xFFFFFFFF;
    else if (srcAn === a1) a1 = (a1 + bytesPerReg) & 0xFFFFFFFF;
    else if (srcAn === a2) a2 = (a2 + bytesPerReg) & 0xFFFFFFFF;
    else if (srcAn === a3) a3 = (a3 + bytesPerReg) & 0xFFFFFFFF;
    else if (srcAn === a4) a4 = (a4 + bytesPerReg) & 0xFFFFFFFF;
    else if (srcAn === a5) a5 = (a5 + bytesPerReg) & 0xFFFFFFFF;
    else if (srcAn === a6) a6 = (a6 + bytesPerReg) & 0xFFFFFFFF;
    else if (srcAn === a7) a7 = (a7 + bytesPerReg) & 0xFFFFFFFF;
    
    const mask = MASK[size];
    value &= mask;
    
    if (dstDn === d0) d0 = value;
    else if (dstDn === d1) d1 = value;
    else if (dstDn === d2) d2 = value;
    else if (dstDn === d3) d3 = value;
    else if (dstDn === d4) d4 = value;
    else if (dstDn === d5) d5 = value;
    else if (dstDn === d6) d6 = value;
    else if (dstDn === d7) d7 = value;
    else {
        console.warn("MOVEDATAINC: destination must be D0–D7");
        return;
    }
    
    // Update flags
    const negative = (value & SIGN_BIT[size]) !== 0;
    const zero = value === 0;
    CCR.N = negative;
    CCR.Z = zero;
    CCR.V = false;
    CCR.C = false;

    console.log(`MOVEDATAINC: ${srcAn} + ${bytesPerReg} = ${a0}`);
    console.log(`d0: 0x${d0.toString(16)}`);
}

// ────────────────────────────────────────────────────────────────
// move.<size> (An)+,(Am,Dn.w)  → Read from An+, write to indexed address
// ────────────────────────────────────────────────────────────────
function MOVEDATAINC_TO_INDEXED(srcAn, baseAn, indexDn, size = 'b') {
    advancePC(4);
    
    let srcAddr;
    if (srcAn === a0) srcAddr = a0;
    else if (srcAn === a1) srcAddr = a1;
    else if (srcAn === a2) srcAddr = a2;
    else if (srcAn === a3) srcAddr = a3;
    else if (srcAn === a4) srcAddr = a4;
    else if (srcAn === a5) srcAddr = a5;
    else if (srcAn === a6) srcAddr = a6;
    else if (srcAn === a7) srcAddr = a7;
    else {
        console.warn("MOVEDATAINC_TO_INDEXED: source must be A0–A7");
        return;
    }
    
    const bytesPerReg = size === 'b' ? 1 : size === 'w' ? 2 : 4;
    let value;
    
    if (size === 'b') {
        value = memory[srcAddr & 0xFFFFFFFF];
    } else if (size === 'w') {
        value = (memory[srcAddr & 0xFFFFFFFF] << 8) | memory[(srcAddr + 1) & 0xFFFFFFFF];
    } else {
        value = readl(srcAddr);
    }
    
    // Post-increment source
    if (srcAn === a0) a0 = (a0 + bytesPerReg) & 0xFFFFFFFF;
    else if (srcAn === a1) a1 = (a1 + bytesPerReg) & 0xFFFFFFFF;
    else if (srcAn === a2) a2 = (a2 + bytesPerReg) & 0xFFFFFFFF;
    else if (srcAn === a3) a3 = (a3 + bytesPerReg) & 0xFFFFFFFF;
    else if (srcAn === a4) a4 = (a4 + bytesPerReg) & 0xFFFFFFFF;
    else if (srcAn === a5) a5 = (a5 + bytesPerReg) & 0xFFFFFFFF;
    else if (srcAn === a6) a6 = (a6 + bytesPerReg) & 0xFFFFFFFF;
    else if (srcAn === a7) a7 = (a7 + bytesPerReg) & 0xFFFFFFFF;
    
    // Calculate destination address
    let baseAddr;
    if (baseAn === a0) baseAddr = a0;
    else if (baseAn === a1) baseAddr = a1;
    else if (baseAn === a2) baseAddr = a2;
    else if (baseAn === a3) baseAddr = a3;
    else if (baseAn === a4) baseAddr = a4;
    else if (baseAn === a5) baseAddr = a5;
    else if (baseAn === a6) baseAddr = a6;
    else if (baseAn === a7) baseAddr = a7;
    else {
        console.warn("MOVEDATAINC_TO_INDEXED: base must be A0–A7");
        return;
    }
    
    let index;
    if (indexDn === d0) index = d0;
    else if (indexDn === d1) index = d1;
    else if (indexDn === d2) index = d2;
    else if (indexDn === d3) index = d3;
    else if (indexDn === d4) index = d4;
    else if (indexDn === d5) index = d5;
    else if (indexDn === d6) index = d6;
    else if (indexDn === d7) index = d7;
    else {
        console.warn("MOVEDATAINC_TO_INDEXED: index must be D0–D7");
        return;
    }
    
    const dstAddr = (baseAddr + (index & 0xFFFF)) & 0xFFFFFFFF;
    
    // Write to output buffer if within range
    if (baseAddr === OUTPUT_BUFFER_ADDR && dstAddr < OUTPUT_BUFFER_ADDR + OUTPUT_BUFFER_SIZE) {
        if (size === 'b') {
            outputBuffer[index & 0xFF] = value & 0xFF;
        } else if (size === 'w') {
            outputBuffer[index & 0xFF] = (value >>> 8) & 0xFF;
            outputBuffer[(index + 1) & 0xFF] = value & 0xFF;
        } else {
            outputBuffer[index & 0xFF] = (value >>> 24) & 0xFF;
            outputBuffer[(index + 1) & 0xFF] = (value >>> 16) & 0xFF;
            outputBuffer[(index + 2) & 0xFF] = (value >>> 8) & 0xFF;
            outputBuffer[(index + 3) & 0xFF] = value & 0xFF;
        }
    } else {
        if (size === 'b') {
            memory[dstAddr & 0xFFFFFFFF] = value & 0xFF;
        } else if (size === 'w') {
            memory[dstAddr & 0xFFFFFFFF] = (value >>> 8) & 0xFF;
            memory[(dstAddr + 1) & 0xFFFFFFFF] = value & 0xFF;
        } else {
            memory[dstAddr & 0xFFFFFFFF] = (value >>> 24) & 0xFF;
            memory[(dstAddr + 1) & 0xFFFFFFFF] = (value >>> 16) & 0xFF;
            memory[(dstAddr + 2) & 0xFFFFFFFF] = (value >>> 8) & 0xFF;
            memory[(dstAddr + 3) & 0xFFFFFFFF] = value & 0xFF;
        }
    }
}

// ────────────────────────────────────────────────────────────────
// move.b Dn,(Am,Dn2.w)  → Write byte from register to indexed address
// ────────────────────────────────────────────────────────────────
function MOVEDATAREG_TO_INDEXED(srcDn, baseAn, indexDn2, size = 'b') {
    advancePC(4);
    
    let srcValue;
    if (srcDn === d0) srcValue = d0;
    else if (srcDn === d1) srcValue = d1;
    else if (srcDn === d2) srcValue = d2;
    else if (srcDn === d3) srcValue = d3;
    else if (srcDn === d4) srcValue = d4;
    else if (srcDn === d5) srcValue = d5;
    else if (srcDn === d6) srcValue = d6;
    else if (srcDn === d7) srcValue = d7;
    else {
        console.warn("MOVEDATAREG_TO_INDEXED: source must be D0–D7");
        return;
    }
    
    let baseAddr;
    if (baseAn === a0) baseAddr = a0;
    else if (baseAn === a1) baseAddr = a1;
    else if (baseAn === a2) baseAddr = a2;
    else if (baseAn === a3) baseAddr = a3;
    else if (baseAn === a4) baseAddr = a4;
    else if (baseAn === a5) baseAddr = a5;
    else if (baseAn === a6) baseAddr = a6;
    else if (baseAn === a7) baseAddr = a7;
    else {
        console.warn("MOVEDATAREG_TO_INDEXED: base must be A0–A7");
        return;
    }
    
    let index;
    if (indexDn2 === d0) index = d0;
    else if (indexDn2 === d1) index = d1;
    else if (indexDn2 === d2) index = d2;
    else if (indexDn2 === d3) index = d3;
    else if (indexDn2 === d4) index = d4;
    else if (indexDn2 === d5) index = d5;
    else if (indexDn2 === d6) index = d6;
    else if (indexDn2 === d7) index = d7;
    else {
        console.warn("MOVEDATAREG_TO_INDEXED: index must be D0–D7");
        return;
    }
    
    const dstAddr = (baseAddr + (index & 0xFFFF)) & 0xFFFFFFFF;
    const byteValue = srcValue & 0xFF;
    
    // Write to output buffer if within range
    if (baseAddr === OUTPUT_BUFFER_ADDR && dstAddr < OUTPUT_BUFFER_ADDR + OUTPUT_BUFFER_SIZE) {
        outputBuffer[index & 0xFF] = byteValue;
    } else {
        memory[dstAddr & 0xFFFFFFFF] = byteValue;
    }
}

// ────────────────────────────────────────────────────────────────
// move.b (Am,Dn.w),(Am2,Dn2.w)  → Copy from indexed to indexed
// ────────────────────────────────────────────────────────────────
function MOVEDATAINDEXED_TO_INDEXED(srcBaseAn, srcIndexDn, dstBaseAn, dstIndexDn, size = 'b') {
    advancePC(6);
    
    let srcBaseAddr;
    if (srcBaseAn === a0) srcBaseAddr = a0;
    else if (srcBaseAn === a1) srcBaseAddr = a1;
    else if (srcBaseAn === a2) srcBaseAddr = a2;
    else if (srcBaseAn === a3) srcBaseAddr = a3;
    else if (srcBaseAn === a4) srcBaseAddr = a4;
    else if (srcBaseAn === a5) srcBaseAddr = a5;
    else if (srcBaseAn === a6) srcBaseAddr = a6;
    else if (srcBaseAn === a7) srcBaseAddr = a7;
    else {
        console.warn("MOVEDATAINDEXED_TO_INDEXED: src base must be A0–A7");
        return;
    }
    
    let srcIndex;
    if (srcIndexDn === d0) srcIndex = d0;
    else if (srcIndexDn === d1) srcIndex = d1;
    else if (srcIndexDn === d2) srcIndex = d2;
    else if (srcIndexDn === d3) srcIndex = d3;
    else if (srcIndexDn === d4) srcIndex = d4;
    else if (srcIndexDn === d5) srcIndex = d5;
    else if (srcIndexDn === d6) srcIndex = d6;
    else if (srcIndexDn === d7) srcIndex = d7;
    else {
        console.warn("MOVEDATAINDEXED_TO_INDEXED: src index must be D0–D7");
        return;
    }
    
    let dstBaseAddr;
    if (dstBaseAn === a0) dstBaseAddr = a0;
    else if (dstBaseAn === a1) dstBaseAddr = a1;
    else if (dstBaseAn === a2) dstBaseAddr = a2;
    else if (dstBaseAn === a3) dstBaseAddr = a3;
    else if (dstBaseAn === a4) dstBaseAddr = a4;
    else if (dstBaseAn === a5) dstBaseAddr = a5;
    else if (dstBaseAn === a6) dstBaseAddr = a6;
    else if (dstBaseAn === a7) dstBaseAddr = a7;
    else {
        console.warn("MOVEDATAINDEXED_TO_INDEXED: dst base must be A0–A7");
        return;
    }
    
    let dstIndex;
    if (dstIndexDn === d0) dstIndex = d0;
    else if (dstIndexDn === d1) dstIndex = d1;
    else if (dstIndexDn === d2) dstIndex = d2;
    else if (dstIndexDn === d3) dstIndex = d3;
    else if (dstIndexDn === d4) dstIndex = d4;
    else if (dstIndexDn === d5) dstIndex = d5;
    else if (dstIndexDn === d6) dstIndex = d6;
    else if (dstIndexDn === d7) dstIndex = d7;
    else {
        console.warn("MOVEDATAINDEXED_TO_INDEXED: dst index must be D0–D7");
        return;
    }
    
    const srcAddr = (srcBaseAddr + (srcIndex & 0xFFFF)) & 0xFFFFFFFF;
    const dstAddr = (dstBaseAddr + (dstIndex & 0xFFFF)) & 0xFFFFFFFF;
    
    let value;
    if (srcBaseAddr === OUTPUT_BUFFER_ADDR && srcAddr < OUTPUT_BUFFER_ADDR + OUTPUT_BUFFER_SIZE) {
        value = outputBuffer[srcIndex & 0xFF];
    } else {
        value = memory[srcAddr & 0xFFFFFFFF];
    }
    
    if (dstBaseAddr === OUTPUT_BUFFER_ADDR && dstAddr < OUTPUT_BUFFER_ADDR + OUTPUT_BUFFER_SIZE) {
        outputBuffer[dstIndex & 0xFF] = value;
    } else {
        memory[dstAddr & 0xFFFFFFFF] = value;
    }
}


// ────────────────────────────────────────────────────────────────
// MOVEM   (sp)+, registers    → Pop multiple registers from stack
// ────────────────────────────────────────────────────────────────
function MOVEM_FROM_SP(maskOrList, size = 'l') {
  advancePC(4);

  const bytesPerReg = size === 'b' ? 1 : size === 'w' ? 2 : 4;

  let registersToPop = [];

  if (typeof maskOrList === 'number') {
    const mask = maskOrList;

    // Collect registers in NORMAL order: D0→D7, A0→A7
    for (let i = 0; i < 8; i++) {
      if (mask & (1 << i)) {
        registersToPop.push({ reg: `d${i}`, index: i, isData: true });
      }
    }

    for (let i = 0; i < 8; i++) {
      if (mask & (1 << (i + 8))) {
        registersToPop.push({ reg: `a${i}`, index: i, isData: false });
      }
    }
  } else {
    console.error("MOVEM_FROM_SP: Only mask number supported");
    return;
  }

  // Pop in order (lowest reg first)
  registersToPop.forEach(({ reg, index, isData }) => {
    let value = 0;

    if (size === 'l') {
      value = (memory[a7 + 0] << 24) | (memory[a7 + 1] << 16) | 
              (memory[a7 + 2] << 8) | memory[a7 + 3];
    } else if (size === 'w') {
      value = (memory[a7 + 0] << 8) | memory[a7 + 1];
      if (isData) {
        // Sign extend for data registers
        value = (value & 0x8000) ? (value | 0xFFFF0000) : value;
      }
    } else if (size === 'b') {
      value = memory[a7 + 0];
      if (isData) {
        // Sign extend for data registers
        value = (value & 0x80) ? (value | 0xFFFFFF00) : value;
      }
    }

    a7 += bytesPerReg;

    if (isData) {
      const regs = [d0, d1, d2, d3, d4, d5, d6, d7];
      if (index === 0) d0 = value;
      else if (index === 1) d1 = value;
      else if (index === 2) d2 = value;
      else if (index === 3) d3 = value;
      else if (index === 4) d4 = value;
      else if (index === 5) d5 = value;
      else if (index === 6) d6 = value;
      else if (index === 7) d7 = value;
    } else {
      if (index === 0) a0 = value;
      else if (index === 1) a1 = value;
      else if (index === 2) a2 = value;
      else if (index === 3) a3 = value;
      else if (index === 4) a4 = value;
      else if (index === 5) a5 = value;
      else if (index === 6) a6 = value;
      else if (index === 7) a7 = value;
    }

    console.log(`[MOVEM.${size}] Popped ${reg} = 0x${value.toString(16).padStart(8, '0')} from 0x${(a7 - bytesPerReg).toString(16).padStart(8, '0')}`);
  });

  console.log(`[MOVEM.${size}] Flags unchanged`);
}


function startDecompression(jimDataPtr) {
    loadROM();
    console.log(`Starting decompression at 0x${jimDataPtr.toString(16)}`);
    let pos = jimDataPtr
    console.log(`Data pointer at 0x${pos.toString(16)}`);
    console.log("Starting with clean flags:");
    resetCCR();
    console.log("Initial CCR:", { ...CCR });

    // IMPORTANT: Set stack pointer BEFORE any stack operations!
    a7 = 0x00FFE000;   // ← Add this! Safe Genesis WRAM stack top

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
    jumpTo(0xDD90);
    console.log("Decompressing graphics...");
    console.log(`[PC] Starting at 0x${pc.toString(16).padStart(8, '0')}`);
    // At the start of decompressGraphics()
    MOVEM_TO_SP(D0_D1_A0_A6, 'l');   // movem.l d0-d1/a0-a6,-(sp)
    // dumpStack(12);   // Shows the 9 pushed registers + 3 more above them (good buffer)

    MOVEA(a2,a0,'l'); // current position in data
    console.log(`Data start at 0x${a0.toString(16)}`);
    MOVE(d4,d1,'w'); // tile offset in bytes
    console.log(`Tile offset: 0x${d1.toString(16)}`);
    ASL(5,d1,'w'); // d1 = d1 * 32 (tile byte offset)
    console.log(`Tile byte offset: 0x${d1.toString(16)}`);
    MOVEDATAINC(a0,d0,'w'); // read first opcode (80 3D)
    console.log(`First opcode: 0x${d0.toString(16)}`);
    
    // Now PC should be pointing right after the move.w (a0)+,d0
    console.log(`[PC] Before branches: 0x${pc.toString(16).padStart(8, '0')}`);

    BEQ(_endDecompression, 'w');    // beq.w _enddecompression
    BMI(_decompress, 'w');          // bmi.w _decompress
    return; // TODO: Remove this
    // Positive literal count path
    // add.w d0,d4
    ADD(d0, d4, 'w');
    
    // asl.w #4,d0
    ASL(4, d0, 'w');
    
    // pea (_enddecompression).l
    PEA(0xDDC8); // Address of _enddecompression
    
    // tst.l (callbackPtr).w
    // Note: callbackPtr is at address in a4, but we need to read from memory
    // For now, we'll check if callbackPtr variable is set
    TST(a4, 'l');
    
    // beq.w DoDMApro
    BEQ(DoDMApro, 'w') || (() => {
        // movea.l (a4),a1
        const callbackAddr = readl(a4);
        MOVEA(callbackAddr, a1, 'l');
        
        // bra.w ConvertAndWriteToVDP
        BRA(ConvertAndWriteToVDP, 'w');
    })();
    
    // After the branch, we'll continue to _enddecompression
    // (In assembly, the PEA pushes the return address, so execution continues there)
    // The branches above will execute the target code, so we don't need to call it again
}

// ────────────────────────────────────────────────────────────────
// Target blocks as functions (they can set pc if they want)
function _decompressFn() {
    jumpTo(0xDDBE);  // Jump to decompression logic
    console.log("=== ENTERING REAL DECOMPRESSION MODE ===");
    
    // Main decompression logic goes here
    // When done, you could set pc to next instruction if needed
    ANDI(0x7FFF, d0);                // andi.<w> #$7FFF,d0
    ADD(d0, d4);                     // add.<w> d0,d4
    BSR(decompressBytecode);         // bsr.<w> decompressBytecode
    return; // TODO: Remove this
}

function _endDecompressionFn() {
    jumpTo(0xDDC8); // set to next instruction after enddecompression label
    console.log("=== END OF DECOMPRESSION ===");
    
    // movem.l (sp)+,d0-d1/a0-a6
    MOVEM_FROM_SP(D0_D1_A0_A6, 'l');
    
    // rts - return from subroutine
    // (In JavaScript, this just returns from the function)
}

// ────────────────────────────────────────────────────────────────
// Main bytecode interpreter
// ────────────────────────────────────────────────────────────────
function decompressBytecode() {
    jumpTo(0xDDCE);
    console.log("=== DECOMPRESSING BYTECODE ===");
    
    // movea.w #(DispAttribCtr-M68K_RAM),a1
    const dispAttribCtr = OUTPUT_BUFFER_ADDR;
    MOVEA(dispAttribCtr, a1, 'w');
    
    // movea.w #(DispAttribCtr-M68K_RAM),a3
    MOVEA(dispAttribCtr, a3, 'w');
    
    // movea.w #(callbackPtr-M68K_RAM),a4
    const callbackPtrAddr = 0; // Will be set if callback exists
    MOVEA(callbackPtrAddr, a4, 'w');
    jumpTo(0xDDDA);
    
    // movea.l #$D642,a5 - ConvertAndWriteToVDP
    MOVEA(ConvertAndWriteToVDP, a5, 'l');
    
    // movea.l #$DA98,a6 - DoDMApro
    MOVEA(DoDMApro, a6, 'l');
    
    // movem.l d0-d3/a0-a2,-(sp)
    MOVEM_TO_SP(D0_D3_A0_A2, 'l');
    
    // move.w d1,d3
    MOVE(d1, d3, 'w');
    
    // clr.w d1
    CLR(d1, 'w');
    
    // clr.w d2
    CLR(d2, 'w');
  

    
    // Main interpreter loop
    main_bytecode_interpreter_loop:
    while (true) {
        // move.b (a0)+,d0
        MOVEDATAINC(a0, d0, 'b');
        return; // TODO: Remove this
        // andi.w #$F0,d0 - Extract upper nibble (opcode type)
        ANDI(0xF0, d0, 'w');
        
        // lsr.w #3,d0 - Shift right 3 to create index into jump table
        LSR(3, d0, 'w');

        // lea jump_table(pc),a2 - get jump table base address
        // In JS, we'll use the JUMP_TABLE array address (simulated)
        LEA(jumpTable, a2);
        
        // move.w (a2,d0.w),d0 - Read jump table entry (offset to handler)
        MOVEDATAINDEXED_TO_REG(a2, d0, d0, 'w');
        
        // jsr (a2,d0.w) - Jump to opcode handler
        JSR(a2, d0, 'w');
        
        // bra.s main_bytecode_intepreter_loop
        // Loop continues...
    }
}

// ────────────────────────────────────────────────────────────────
// Output buffer (simulated RAM addresses)
// ────────────────────────────────────────────────────────────────
const OUTPUT_BUFFER_SIZE = 0x100; // 256 bytes
const OUTPUT_BUFFER_ADDR = 0x00FF0000; // Simulated RAM address
let outputBuffer = new Uint8Array(OUTPUT_BUFFER_SIZE);

// Callback pointer (simulated)
let callbackPtr = 0; // Set to non-zero if callback exists

// Function pointers (simulated)
const ConvertAndWriteToVDP = 0xD642;
const DoDMApro = 0xDA98;

// Label addresses
const _endDecompression = 0xDDC8;
const _decompress = 0xDDBE;

// Opcode handler addresses (jump table base + offset)
const Opcode_CopyLiteral_Addr = 0xDE26;
const Opcode_ClearBytes_Addr = 0xDE42;
const Opcode_FillBytes_Addr = 0xDE5E;
const Opcode_CopyBackwardShort_Addr = 0xDE7E;
const Opcode_CopyBackwardMedium_Addr = 0xDEB0;
const Opcode_CopyBackwardLong_Addr = 0xDEBE;
const Opcode_CopyBackwardExtended1_Addr = 0xDED8;
const Opcode_CopyBackwardExtended2_Addr = 0xDEF2;
const Opcode_CopyBackwardReverseShort_Addr = 0xDF0C;
const Opcode_CopyBackwardReverseMedium_Addr = 0xDF3E;
const Opcode_CopyBackwardReverseLong_Addr = 0xDF5E;

// Opcode handler dispatch table - maps handler addresses to functions
const OPCODE_HANDLER_DISPATCH = {
    0xDE26: () => { Opcode_CopyLiteral(); },
    0xDE42: () => { Opcode_ClearBytes(); },
    0xDE5E: () => { Opcode_FillBytes(); },
    0xDE7E: () => { Opcode_CopyBackwardShort(); },
    0xDEB0: () => { Opcode_CopyBackwardMedium(); },
    0xDEBE: () => { Opcode_CopyBackwardLong(); },
    0xDED8: () => { Opcode_CopyBackwardExtended1(); },
    0xDEF2: () => { Opcode_CopyBackwardExtended2(); },
    0xDF0C: () => { Opcode_CopyBackwardReverseShort(); },
    0xDF3E: () => { 
        const result = Opcode_CopyBackwardReverseMedium();
        if (result === 'end') {
            // End of decompression - restore registers and return
            MOVEM_FROM_SP(D0_D3_A0_A2, 'l');
            console.log("=== BYTECODE DECOMPRESSION COMPLETE ===");
            return 'end';
        }
    },
    0xDF5E: () => { Opcode_CopyBackwardReverseLong(); }
};

// Label dispatch table - maps addresses to functions
const LABEL_DISPATCH = {
    0xDDC8: () => { _endDecompressionFn(); },
    0xDDBE: () => { _decompressFn(); },
    0xD642: () => { 
        console.log(`[ConvertAndWriteToVDP] Called with a0=0x${a0.toString(16)}, d0=${d0} words, d1=0x${d1.toString(16)}`);
        // Simulated: would convert and write to VDP
    },
    0xDA98: () => { 
        console.log(`[DoDMApro] Called with a0=0x${a0.toString(16)}, d0=${d0} words`);
        // Simulated: would do DMA transfer
    }
};

// Helper function to execute code at a label address
function executeAtAddress(addr) {
    if (LABEL_DISPATCH[addr]) {
        LABEL_DISPATCH[addr]();
    } else if (OPCODE_HANDLER_DISPATCH[addr]) {
        const result = OPCODE_HANDLER_DISPATCH[addr]();
        if (result === 'end') {
            return 'end';
        }
    } else {
        console.warn(`[executeAtAddress] No handler for address 0x${addr.toString(16).padStart(8, '0')}`);
    }
}

// ────────────────────────────────────────────────────────────────
// Jump table for opcode dispatch
// ────────────────────────────────────────────────────────────────
const jumpTable = 0xDE06; // Simulated address of jump table
const JUMP_TABLE = [
    0x0020, // 0: CopyLiteral
    0x0020, // 1: CopyLiteral
    0x003C, // 2: ClearBytes
    0x0058, // 3: FillBytes
    0x0078, // 4: CopyBackwardShort
    0x0078, // 5: CopyBackwardShort
    0x0078, // 6: CopyBackwardShort
    0x0078, // 7: CopyBackwardShort
    0x00AA, // 8: CopyBackwardMedium
    0x00B8, // 9: CopyBackwardLong
    0x00D2, // A: CopyBackwardExtended1
    0x00EC, // B: CopyBackwardExtended2
    0x0106, // C: CopyBackwardReverseShort
    0x0106, // D: CopyBackwardReverseShort
    0x0138, // E: CopyBackwardReverseMedium
    0x0158  // F: CopyBackwardReverseLong
];

// ────────────────────────────────────────────────────────────────
// Opcode handlers
// ────────────────────────────────────────────────────────────────

function Opcode_CopyLiteral() {
    // move.b -1(a0),d0
    MOVEDATAPREDEC(a0, d0, 'b');
    
    // andi.w #$1F,d0
    ANDI(0x1F, d0, 'w');
    
    let count = d0 & 0xFFFF;
    
    // Copy_bytes_loop:
    while (count >= 0) {
        // move.b (a0)+,(a1,d1.w)
        MOVEDATAINC_TO_INDEXED(a0, a1, d1, 'b');
        
        // addq.b #1,d1
        ADDQ(1, d1, 'b');
        
        // bne.w loop_for_count
        if (d1 === 0) {
            FlushOutputBuffer();
        }
        
        // dbf d0,Copy_bytes_loop
        if (count === 0) break;
        count--;
        d0 = count; // Update d0 for DBF
    }
}

function Opcode_ClearBytes() {
    // move.b -1(a0),d0
    MOVEDATAPREDEC(a0, d0, 'b');
    
    // andi.w #$F,d0
    ANDI(0xF, d0, 'w');
    
    let count = d0 & 0xFFFF;
    
    // Clear_bytes_loop:
    while (count >= 0) {
        // clr.b (a1,d1.w) - write 0 to indexed address
        d2 = 0;
        MOVEDATAREG_TO_INDEXED(d2, a1, d1, 'b');
        
        // addq.b #1,d1
        ADDQ(1, d1, 'b');
        
        // bne.w loop_for_count2
        if (d1 === 0) {
            FlushOutputBuffer();
        }
        
        // dbf d0,Clear_bytes_loop
        if (count === 0) break;
        count--;
        d0 = count;
    }
}

function Opcode_FillBytes() {
    // move.b -1(a0),d0
    MOVEDATAPREDEC(a0, d0, 'b');
    
    // andi.w #$F,d0
    ANDI(0xF, d0, 'w');
    
    // addq.w #2,d0
    ADDQ(2, d0, 'w');
    
    // move.b (a0)+,d2
    MOVEDATAINC(a0, d2, 'b');
    
    let count = d0 & 0xFFFF;
    
    // Fill_bytes_loop:
    while (count >= 0) {
        // move.b d2,(a1,d1.w)
        MOVEDATAREG_TO_INDEXED(d2, a1, d1, 'b');
        
        // addq.b #1,d1
        ADDQ(1, d1, 'b');
        
        // bne.w loop_for_count3
        if (d1 === 0) {
            FlushOutputBuffer();
        }
        
        // dbf d0,Fill_bytes_loop
        if (count === 0) break;
        count--;
        d0 = count;
    }
}

function Opcode_CopyBackwardShort() {
    // move.b -1(a0),d0
    MOVEDATAPREDEC(a0, d0, 'b');
    
    // andi.w #7,d0
    ANDI(0x7, d0, 'w');
    
    // addq.w #1,d0
    ADDQ(1, d0, 'w');
    
    // move.b -1(a0),d2 - read opcode again
    MOVEDATAPREDEC(a0, d2, 'b');
    
    // lsr.w #3,d2
    LSR(3, d2, 'w');
    
    // andi.w #7,d2
    ANDI(0x7, d2, 'w');
    
    // addq.w #1,d2
    ADDQ(1, d2, 'w');
    
    _copybackwardloop1();
}

function Opcode_CopyBackwardMedium() {
    // move.b -1(a0),d0
    MOVEDATAPREDEC(a0, d0, 'b');
    
    // andi.w #$F,d0
    ANDI(0xF, d0, 'w');
    
    // addq.w #2,d0
    ADDQ(2, d0, 'w');
    
    // move.b (a0)+,d2
    MOVEDATAINC(a0, d2, 'b');
    
    _copybackwardloop1();
}

function Opcode_CopyBackwardLong() {
    // move.b (a0),d0 - read byte at current position
    MOVEDATAINC(a0, d0, 'b');
    
    // asl.b #1,d0
    ASL(1, d0, 'b');
    
    // move.b -1(a0),d0 - read opcode byte (overwrites d0)
    MOVEDATAPREDEC(a0, d0, 'b');
    
    // roxl.b #1,d0
    ROXL(1, d0, 'b');
    
    // andi.w #$1F,d0
    ANDI(0x1F, d0, 'w');
    
    // addq.w #2,d0
    ADDQ(2, d0, 'w');
    
    // move.b (a0)+,d2
    MOVEDATAINC(a0, d2, 'b');
    
    // andi.w #$7F,d2
    ANDI(0x7F, d2, 'w');
    
    // addq.w #1,d2
    ADDQ(1, d2, 'w');
    
    _copybackwardloop1();
}

function Opcode_CopyBackwardExtended1() {
    // move.b -1(a0),d0
    MOVEDATAPREDEC(a0, d0, 'b');
    
    // asl.w #8,d0
    ASL(8, d0, 'w');
    
    // move.b (a0),d0 - read next byte and combine
    const nextByte = memory[a0 & 0xFFFFFFFF];
    d0 = (d0 | nextByte) & 0xFFFF;
    
    // lsr.w #6,d0
    LSR(6, d0, 'w');
    
    // andi.w #$3F,d0
    ANDI(0x3F, d0, 'w');
    
    // addq.w #2,d0
    ADDQ(2, d0, 'w');
    
    // move.b (a0)+,d2
    MOVEDATAINC(a0, d2, 'b');
    
    // andi.w #$3F,d2
    ANDI(0x3F, d2, 'w');
    
    // addq.w #1,d2
    ADDQ(1, d2, 'w');
    
    _copybackwardloop1();
}

function Opcode_CopyBackwardExtended2() {
    // move.b -1(a0),d0
    MOVEDATAPREDEC(a0, d0, 'b');
    
    // asl.w #8,d0
    ASL(8, d0, 'w');
    
    // move.b (a0),d0 - read next byte and combine
    const nextByte = memory[a0 & 0xFFFFFFFF];
    d0 = (d0 | nextByte) & 0xFFFF;
    
    // lsr.w #5,d0
    LSR(5, d0, 'w');
    
    // andi.w #$7F,d0
    ANDI(0x7F, d0, 'w');
    
    // addq.w #2,d0
    ADDQ(2, d0, 'w');
    
    // move.b (a0)+,d2
    MOVEDATAINC(a0, d2, 'b');
    
    // andi.w #$1F,d2
    ANDI(0x1F, d2, 'w');
    
    // addq.w #1,d2
    ADDQ(1, d2, 'w');
    
    _copybackwardloop1();
}

function Opcode_CopyBackwardReverseShort() {
    // move.b -1(a0),d0
    MOVEDATAPREDEC(a0, d0, 'b');
    
    // andi.w #3,d0
    ANDI(0x3, d0, 'w');
    
    // addq.w #1,d0
    ADDQ(1, d0, 'w');
    
    // move.b -1(a0),d2 - read opcode again
    MOVEDATAPREDEC(a0, d2, 'b');
    
    // lsr.w #2,d2
    LSR(2, d2, 'w');
    
    // andi.w #7,d2
    ANDI(0x7, d2, 'w');
    
    // addq.w #1,d2
    ADDQ(1, d2, 'w');
    
    _copybackwardsreverseloop1();
}

function Opcode_CopyBackwardReverseMedium() {
    // move.b -1(a0),d0
    MOVEDATAPREDEC(a0, d0, 'b');
    
    // andi.w #$F,d0
    ANDI(0xF, d0, 'w');
    
    // addq.w #2,d0
    ADDQ(2, d0, 'w');
    
    // move.b (a0)+,d2
    MOVEDATAINC(a0, d2, 'b');
    
    // bne.s _copybackwardsreverseloop1
    if (d2 !== 0) {
        _copybackwardsreverseloop1();
        return null;
    } else {
        // tst.w d1
        TST(d1, 'w');
        
        // beq.w _copybackwardsreversemedium_end
        if (CCR.Z) {
            // addq.w #4,sp - skip return address on stack
            ADDQ(4, a7, 'w');
            return 'end'; // End of decompression
        }
        
        // bsr.w FlushOutputBuffer
        BSR(FlushOutputBuffer, 'w');
        
        // addq.w #4,sp - skip return address on stack
        ADDQ(4, a7, 'w');
        
        // Return from function
        return 'end';
    }
}

function Opcode_CopyBackwardReverseLong() {
    // move.b (a0),d0 - read byte at current position
    MOVEDATAINC(a0, d0, 'b');
    
    // asl.b #1,d0
    ASL(1, d0, 'b');
    
    // move.b -1(a0),d0 - read opcode byte (overwrites d0)
    MOVEDATAPREDEC(a0, d0, 'b');
    
    // roxl.b #1,d0
    ROXL(1, d0, 'b');
    
    // andi.w #$1F,d0
    ANDI(0x1F, d0, 'w');
    
    // addq.w #2,d0
    ADDQ(2, d0, 'w');
    
    // move.b (a0)+,d2
    MOVEDATAINC(a0, d2, 'b');
    
    // andi.w #$7F,d2
    ANDI(0x7F, d2, 'w');
    
    // addq.w #1,d2
    ADDQ(1, d2, 'w');
    
    _copybackwardsreverseloop1();
}

// ────────────────────────────────────────────────────────────────
// Helper functions for copy operations
// ────────────────────────────────────────────────────────────────

function _copybackwardloop1() {
    // neg.b d2
    NEG(d2, 'b');
    
    // add.b d1,d2
    ADD(d1, d2, 'b');
    
    let count = d0 & 0xFFFF;
    
    // _copybackwardloop2:
    while (count >= 0) {
        // move.b (a1,d2.w),(a1,d1.w)
        MOVEDATAINDEXED_TO_INDEXED(a1, d2, a1, d1, 'b');
        
        // addq.b #1,d2
        ADDQ(1, d2, 'b');
        
        // addq.b #1,d1
        ADDQ(1, d1, 'b');
        
        // bne.w _copybackwardcheckbuffer
        if (d1 === 0) {
            FlushOutputBuffer();
        }
        
        // dbf d0,_copybackwardloop2
        if (count === 0) break;
        count--;
        d0 = count;
    }
}

function _copybackwardsreverseloop1() {
    // neg.b d2
    NEG(d2, 'b');
    
    // add.b d1,d2
    ADD(d1, d2, 'b');
    
    let count = d0 & 0xFFFF;
    
    // _copybackwardsreverseloop2:
    while (count >= 0) {
        // move.b (a1,d2.w),(a1,d1.w)
        MOVEDATAINDEXED_TO_INDEXED(a1, d2, a1, d1, 'b');
        
        // subq.b #1,d2
        SUBQ(1, d2, 'b');
        
        // addq.b #1,d1
        ADDQ(1, d1, 'b');
        
        // bne.w _chkbuf
        if (d1 === 0) {
            FlushOutputBuffer();
        }
        
        // dbf d0,_copybackwardsreverseloop2
        if (count === 0) break;
        count--;
        d0 = count;
    }
}

// ────────────────────────────────────────────────────────────────
// FlushOutputBuffer - Write output buffer to VDP or callback
// ────────────────────────────────────────────────────────────────
function FlushOutputBuffer() {
    // movem.l d0-d1/a0-a1,-(sp)
    MOVEM_TO_SP(D0_D1_A0_A1, 'l');
    
    // move.w d1,d0
    MOVE(d1, d0, 'w');
    
    // bne.w _checksize
    if (!CCR.Z) {
        // _checksize:
        // lsr.w #1,d0
        LSR(1, d0, 'w');
    } else {
        // move.w #$100,d0
        MOVE(0x100, d0, 'w');
        
        // _checksize:
        // lsr.w #1,d0
        LSR(1, d0, 'w');
    }
    
    // move.w d3,d1
    MOVE(d3, d1, 'w');
    
    // add.w d0,d3
    ADD(d0, d3, 'w');
    
    // add.w d0,d3
    ADD(d0, d3, 'w');
    
    // movea.l a1,a0
    a0 = a1; // Direct register copy
    
    // tst.l (a4)
    TST(a4, 'l');
    
    // beq.w _nocallback
    if (CCR.Z) {
        // _nocallback:
        // jsr (a6) - DoDMApro
        JSR(a6);
        console.log(`[FlushOutputBuffer] Called DoDMApro with ${d0} words`);
    } else {
        // movea.l (a4),a1
        const callbackAddr = readl(a4);
        MOVEA(callbackAddr, a1, 'l');
        
        // jsr (a5) - ConvertAndWriteToVDP
        JSR(a5);
        console.log(`[FlushOutputBuffer] Called ConvertAndWriteToVDP with ${d0} words`);
    }
    
    // _done:
    // movem.l (sp)+,d0-d1/a0-a1
    MOVEM_FROM_SP(D0_D1_A0_A1, 'l');
    
    // Reset output buffer position
    CLR(d1, 'w');
}

startDecompression(0x7C974);