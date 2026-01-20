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
// Example usage — assembly-like
// ────────────────────────────────────────────────────────────────

resetCCR();

a2 = 0x00008000;
MOVEA(a2, a0, 'l');           // movea.l a2,a0
console.log("a0 =", a0.toString(16));          // 8000

d0 = 0x4000;                  // 0100 0000 0000 0000
ASL(1, d0, 'w');              // asl.w #1,d0
console.log("d0 =", d0.toString(16));          // 8000
console.log("CCR =", { ...CCR });             // N=1, Z=0, V=1, C=0, X=0

ASL(1, d0, 'w');              // asl.w #1,d0  again
console.log("d0 =", d0.toString(16));          // 0000
console.log("CCR =", { ...CCR });             // N=0, Z=1, V=1, C=1, X=1

d1 = 0x00000003;              // 0000 0011
ASL(2, d1, 'b');              // asl.b #2,d1
console.log("d1 =", d1.toString(16));          // 0c
console.log("CCR =", { ...CCR });             // N=0, Z=0, V=0, C=0, X=0


function startDecompression(jimDataPtr, data) {
    console.log("Starting with clean flags:");
    resetCCR();
    console.log("Initial CCR:", { ...CCR });
    var pos = jimDataPtr;
    let paletteOffset = readl(pos); pos = incl(pos);
    let tileMapHeaderOffset = readl(pos); pos = incl(pos);
    a2 = jimDataPtr;
    let tileOffset = 0;
    d4 = tileOffset;
    decompressGraphics(pos, data);
}

function decompressGraphics(jimDataPtr, data) {
    MOVEA(a2,a0,'l'); // current position in data
    MOVE(d4,d1,'w'); // tile offset in bytes
    
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

function readb(pos) { //1 byte, 8 bits
    return;
}
function readw(pos) { //2 bytes, 16 bits
    return;
}
function readl(pos) { //4 bytes, 32 bits
    return;
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