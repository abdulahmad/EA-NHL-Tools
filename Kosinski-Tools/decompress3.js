// Emulate 68k registers
let D0 = 0, D1 = 0, D2 = 0, D3 = 0, D5 = 0, D6 = 0; // Data registers
let A0 = 0, A2 = 0, A3 = 0, A7 = []; // Address registers (A7 as stack)
let PC = 0; // Program counter (not fully used here)

// Compressed tile data (after first 10 bytes)
const compressedData = [
  0x31, 0x66, 0x00, 0x65, 0x30, 0x55, 0x00, 0x65,
  0x30, 0x44, 0x03, 0x65, 0x47, 0x77, 0x77
];
let output = []; // Decompressed data

// Subroutines from jump table
function sub_0020() {
    console.log("Executing sub_0020...");
  // $11734: Copy n bytes from source to dest
  D0 = compressedData[A0 - 1] & 0x1F; // MOVE.B (-1,A0),D0; ANDI.W #$1F,D0
  do {
    output[A3++] = compressedData[A0++]; // MOVE.B (A0)+,(A3)+
    D1 += 1; // ADDQ.W #1,D1 (contextual, unused here)
    if (D1 === 0) console.warn("D1 zero, JSR to $11874 not implemented");
  } while (D0-- > 0); // DBRA D0,sub_0020
}

function sub_003C() {
    console.log("Executing sub_003C...");
  // $11750: Write n+1 zeros to dest
  D0 = compressedData[A0 - 1] & 0x0F; // ANDI.W #$0F,D0
  do {
    output[A3++] = 0; // CLR.W (A3)+ (simplified as byte)
    D1 += 1;
    if (D1 === 0) console.warn("D1 zero, JSR to $11874 not implemented");
  } while (D0-- > 0);
}

function sub_0058() {
    console.log("Executing sub_0058...");
  // $1176C: Copy byte n+4 times
  D0 = (compressedData[A0 - 1] & 0x0F) + 4; // ANDI.W #$0F,D0; ADDQ.W #4,D0
  D2 = compressedData[A0++]; // MOVE.B (A0)+,D2
  do {
    output[A3++] = D2; // MOVE.B D2,(A3)+
    D1 += 1;
    if (D1 === 0) console.warn("D1 zero, JSR to $11874 not implemented");
  } while (D0-- > 0);
}

function sub_0078() {
    console.log("Executing sub_0078...");
  // $11788: Repeat byte n+3 times (adjusted from assembly)
  D0 = (compressedData[A0 - 1] & 0x0F) + 3; // ANDI.W #$07,D0; adjusted to match data
  const byte = compressedData[A0++]; // MOVE.B (A0)+,D2 (simplified)
  do {
    output[A3++] = byte; // MOVE.B D2,(A3)+
    D1 += 1;
    if (D1 === 0) console.warn("D1 zero, JSR to $11874 not implemented");
  } while (D0-- > 0);
}

function sub_00AA() {
    console.log("Executing sub_00AA...");
  // $117BE: Placeholder, copy with shift (incomplete)
  D0 = compressedData[A0 - 1] & 0x0F; // ANDI.W #$0F,D0
  do {
    output[A3++] = compressedData[A0++]; // MOVE.B (A0)+,(A3)+
  } while (D0-- > 0);
}

function sub_00B8() {
    console.log("Executing sub_00B8...");
  // $117CC: Placeholder, adjusted copy
  D0 = (compressedData[A0 - 1] >> 1) & 0x1F; // E3 10; ANDI.W #$1F,D0
  do {
    output[A3++] = compressedData[A0++]; // MOVE.B (A0)+,(A3)+
  } while (D0-- > 0);
}

function sub_00D2() {
    console.log("Executing sub_00D2...");
  // $117E6: Placeholder, complex copy
  D0 = (compressedData[A0 - 1] >> 2) & 0x3F; // EA 48; ANDI.W #$3F,D0
  do {
    output[A3++] = compressedData[A0++]; // MOVE.B (A0)+,(A3)+
  } while (D0-- > 0);
}

function sub_00EC() {
    console.log("Executing sub_00EC...");
  // $11800: Placeholder, simple copy
  D0 = compressedData[A0 - 1] & 0x03; // ANDI.W #$03,D0
  do {
    output[A3++] = compressedData[A0++]; // MOVE.B (A0)+,(A3)+
  } while (D0-- > 0);
}

function sub_0106() {
    console.log("Executing sub_0106...");
  // $1181A: Placeholder, conditional copy
  D0 = compressedData[A0 - 1] & 0x0F; // ANDI.W #$0F,D0
  do {
    output[A3++] = compressedData[A0++]; // MOVE.B (A0)+,(A3)+
  } while (D0-- > 0);
}

function sub_0138() {
    console.log("Executing sub_0138...");
  // $1184C: Placeholder, basic copy
  if (D1 !== 0) {
    D0 = compressedData[A0 - 1] & 0x1F; // ANDI.W #$1F,D0
    do {
      output[A3++] = compressedData[A0++]; // MOVE.B (A0)+,(A3)+
    } while (D0-- > 0);
  }
}

function sub_0158() {
    console.log("Executing sub_0158...");
  // $1186C: Placeholder, simple copy
  D0 = (compressedData[A0 - 1] >> 1) & 0x1F; // E3 10; ANDI.W #$1F,D0
  do {
    output[A3++] = compressedData[A0++]; // MOVE.B (A0)+,(A3)+
  } while (D0-- > 0);
}

// Jump table as function array
const jumpTable = [
  sub_0020, sub_0020, sub_003C, sub_0058,
  sub_0078, sub_0078, sub_0078, sub_0078,
  sub_00AA, sub_00B8, sub_00D2, sub_00EC,
  sub_0106, sub_0106, sub_0138, sub_0158
];

// Main decompression function
function decompress_map_jim() {
    console.log("Decompressing map.jim...");
    A7.push(0); // MOVE.W ($B02A).W,-(A7) (simplified)
    A7.push(0); // MOVE.W ($BF78).W,-(A7)
    // BTST #2,($BF78).W (assume true, proceed)
    D1 = 0; D2 = 0; D3 = 0xBD28; D5 = 0; D6 = 0; // MOVEM.L setup
    A0 = 0; A3 = 0; // Initial pointers

    // setup_loop:
    A0 += 32; // ADDA.L #$20,A0 (skip header, adjusted for tile data)
    A3 += 32; // ADDA.L #$20,A3
    D0 = 31; // MOVEQ #31,D0
    D5 >>= 1; // LSR.W D5
    console.log(`A0: ${A0}, A3: ${A3}, D0: ${D0}, D5: ${D5}`);
    // if (D5 & 1) { // BCS copy_block
        console.log("Copying block...");
        do {
            // console.log(A3 + D0, compressedData[A0 + D0]); // Debug output
            output[A3 + D0] = compressedData[A0 + D0]; // MOVE.B (A0,D0.W),(A3,D0.W)
        } while (D0-- > 0);
    // }
    if (D5 !== 0) return; // BNE setup_loop (simplified)

    // decompress_loop:
    for (let i=0; i<output.length; i++) {
        if (output[i] !== undefined) {
            console.log(`Output[${i}]: ${output[i].toString(16).padStart(2, '0')}`);
        }
    }
    console.log("Starting decompression loop...", A0, compressedData.length);
    while (A0 < compressedData.length) {
        D0 = compressedData[A0++]; // MOVE.B (A0)+,D0
        D0 = (D0 & 0xF0) >> 3; // ANDI.W #$F0,D0; LSR.W #3,D0
        const offset = jumpTable[D0]; // LEA jump_table(PC),A2; MOVE.W (A2,D0.W),D0
        offset(); // JSR (A2,D0.W)
        // BRA decompress_loop (loop continues)
    }
}

// Run decompression
decompress_map_jim();
// console.log(output.map(b => b.toString(16).padStart(2, '0')).join(' '));
for (let i=0; i<output.length; i++) {
    if (output[i] !== undefined) {
        console.log(`Output[${i}]: ${output[i].toString(16).padStart(2, '0')}`);
    }
}