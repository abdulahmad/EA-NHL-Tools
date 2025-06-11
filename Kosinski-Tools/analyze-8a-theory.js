// Let's analyze the pattern more carefully
// The current output before 8A 20 is 96 bytes ending with:
// 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92

// The expected output should add just "77" 
// But 8A = 0x8 + 0xA (subcommand A = 10)
// 20 = 32 in decimal

// Maybe the interpretation is wrong. Let me think about this differently:

// Current interpretation (WRONG):
// 8A 20 -> copy last 32 bytes and repeat them 32 times = 32*32 = 1024 bytes

// But what if it's:
// 8A -> some specific operation 
// 20 -> parameter

// Looking at the assembly code, 0x80-0x8F seems to be a range of commands
// Maybe 8A specifically means something different than 8D

// Let me examine what 8A could mean:
// A = 10 in hex
// Maybe it means: copy 1 byte from offset -10?
// Or copy 1 byte from offset -(10+something)?

// Looking at the last 32 bytes:
// Position: 96-32 = 64 to 96
// If we want to get 0x77, and there are many 0x77s in positions 76-84 (approximately)
// Offset -10 from position 96 would be position 86, which should contain 0x77

const lastBytes = [0x66, 0x66, 0x66, 0x66, 0x55, 0x55, 0x55, 0x55, 0x44, 0x44, 0x44, 0x44, 0x77, 0x77, 0x77, 0x77, 0x77, 0x77, 0x77, 0x77, 0x77, 0x77, 0x77, 0x18, 0x77, 0x77, 0x18, 0x88, 0x77, 0x18, 0x88, 0x92];

console.log('Last 32 bytes with indices:');
for (let i = 0; i < lastBytes.length; i++) {
    console.log(`Index -${32-i}: 0x${lastBytes[i].toString(16).padStart(2, '0')}`);
}

console.log('\nMaybe 8A 20 means:');
console.log('- 8A: Copy from offset -10 (A=10)');
console.log('- 20: Count = 1 (since we only expect 1 byte of output)');

// Let's check offset -10
const offset10 = lastBytes[lastBytes.length - 10];
console.log(`\nByte at offset -10: 0x${offset10.toString(16)}`);

// But that's 0x77, which matches our expectation!
// But 20 = 32, not 1. So maybe the count calculation is different.

console.log('\nAnother theory:');
console.log('Maybe for 8A commands, the count is calculated differently');
console.log('Maybe count = parameter >> 5 (32 >> 5 = 1)');
console.log('Or count = 1 always for 8A');
console.log('Or the parameter 20 is used differently');

// Let me check what happens if we use offset -A (10) and count = 1
console.log('\nIf 8A 20 means: copy 1 byte from offset -10:');
console.log(`Result: 0x${offset10.toString(16)} (which is what we expect!)`);
