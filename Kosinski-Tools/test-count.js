// Let's check the count calculation for 0x5E
// 0x5E = low nibble 0xE = 14

const expectedLength = [0x77, 0x77, 0x77, 0x18, 0x77, 0x77, 0x77, 0x18, 0x77, 0x77, 0x77, 0x18, 0x77, 0x77].length;
console.log("Expected output length:", expectedLength);

// Current implementation: count = lowNibble + 2
const currentCount = 14 + 2;
console.log("Current count calculation (lowNibble + 2):", currentCount);

// Alternative: count = lowNibble
const altCount = 14;
console.log("Alternative count (just lowNibble):", altCount);

// The expected output is exactly 14 bytes, which matches lowNibble exactly!
// So the count should be just the lowNibble, not lowNibble + 2

console.log("Expected length matches lowNibble:", expectedLength === altCount);

// But we also need to figure out how to find the pattern to repeat
// Looking at the 68k assembly might give us clues about pattern detection
